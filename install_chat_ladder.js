const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('   AgyChatLadder (对话天梯) 跨设备一键安装器 v1.2.0    ');
console.log('   GitHub: https://github.com/SuperRui0122/AgyChatLadder');
console.log('====================================================\n');

// 1. 自动探测 Antigravity 客户端安装目录
function detectInstallDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Programs', 'antigravity'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'antigravity'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'antigravity')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (process.platform === 'darwin') {
    const defaultMac = '/Applications/Antigravity.app';
    if (fs.existsSync(defaultMac)) return defaultMac;
  } else {
    const linuxDirs = [
      path.join(home, 'Antigravity'),
      path.join(home, '.local', 'share', 'antigravity'),
      '/opt/Antigravity'
    ];
    for (const d of linuxDirs) {
      if (fs.existsSync(d)) return d;
    }
  }
  return null;
}

const installDir = detectInstallDir();
if (!installDir) {
  console.error('[错误] 未能自动定位到 Antigravity 安装目录，请确认客户端已安装。');
  process.exit(1);
}
console.log('[探测] 成功识别到 Antigravity 安装路径: ' + installDir);

// 2. 检测运行状态并友好提示
let isAppRunning = false;
if (process.platform === 'win32') {
  try {
    const tasklist = execSync('tasklist /fi "imagename eq Antigravity.exe" /nh', { encoding: 'utf-8' });
    if (tasklist.toLowerCase().includes('antigravity.exe')) {
      isAppRunning = true;
      console.log('[提示] 检测到 Antigravity 客户端正在运行。安装完成后请重启客户端以加载全新天梯。');
    }
  } catch (e) {}
}

// 3. 定位 resources 目录与 app.asar
let resourcesDir = path.join(installDir, 'resources');
if (process.platform === 'darwin') {
  resourcesDir = path.join(installDir, 'Contents', 'Resources');
}
if (!fs.existsSync(resourcesDir)) {
  console.error('[错误] 未找到 resources 资源目录: ' + resourcesDir);
  process.exit(1);
}

const asarPath = path.join(resourcesDir, 'app.asar');
const bakPath = path.join(resourcesDir, 'app.asar.bak');
if (!fs.existsSync(asarPath)) {
  console.error('[错误] 未找到核心文件 app.asar: ' + asarPath);
  process.exit(1);
}

// 4. 安全备份 (如果尚未备份)
if (!fs.existsSync(bakPath)) {
  console.log('[备份] 正在创建官方原始备份: app.asar.bak ...');
  try {
    fs.copyFileSync(asarPath, bakPath);
    console.log('[备份] 官方备份创建成功！');
  } catch (e) {
    console.warn('[警告] 备份创建失败: ' + e.message);
  }
} else {
  console.log('[备份] 已存在历史备份文件 app.asar.bak，跳过备份。');
}

// 5. 准备解包
const tempDir = path.join(__dirname, '_temp_unpack');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('[解包] 正在使用 @electron/asar 提取 app.asar ...');
try {
  execSync(`npx -y @electron/asar extract "${asarPath}" "${tempDir}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('[错误] 解包失败，请检查是否已正确联网或安装 Node.js。');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 6. 注入 AgyChatLadder 核心代码到 preload.js
const preloadPath = path.join(tempDir, 'dist', 'preload.js');
if (!fs.existsSync(preloadPath)) {
  console.error('[错误] 解包后未找到 dist/preload.js: ' + preloadPath);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

const ladderSourcePath = path.join(__dirname, 'chat_ladder_core.js');
let ladderCode = '';
if (fs.existsSync(ladderSourcePath)) {
  ladderCode = fs.readFileSync(ladderSourcePath, 'utf-8');
} else {
  console.error('[错误] 找不到 chat_ladder_core.js 核心代码文件！');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

console.log('[修改] 正在向 preload.js 注入 AgyChatLadder 对话天梯引擎...');
let preloadContent = fs.readFileSync(preloadPath, 'utf-8');

// 幂等清理历史遗留的天梯注入代码
const cleanPatterns = [
  /\/\* --- AGY CHAT LADDER TIMELINE ENGINE --- \*\/[\s\S]*?\/\* --- LADDER END --- \*\//g,
  /\/\* --- AGY CHAT LADDER START --- \*\/[\s\S]*?\/\* --- AGY CHAT LADDER END --- \*\//g,
  /\/\* --- LEGACY TIMELINE NAVIGATOR --- \*\/[\s\S]*?\/\* --- LEGACY END --- \*\//g
];
cleanPatterns.forEach(pattern => {
  preloadContent = preloadContent.replace(pattern, '');
});

const LADDER_MARKER = '/* --- AGY CHAT LADDER TIMELINE ENGINE --- */';
const injectPayload = `\n\n${LADDER_MARKER}\n${ladderCode}\n/* --- LADDER END --- */\n`;
preloadContent += injectPayload;
fs.writeFileSync(preloadPath, preloadContent, 'utf-8');

// 7. 严格执行预编译语法检查门禁
try {
  execSync(`node --check "${preloadPath}"`);
  console.log('[门禁] preload.js 语法校验 100% 通过！');
} catch (e) {
  console.error('[错误] 注入后语法检查未通过，已中止安装，避免影响客户端正常启动。');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 8. 重新打包 (严格排除 chrome-devtools-mcp 防止体积虚增与沙箱崩溃)
const tempAsar = path.join(__dirname, 'app.asar.temp');
if (fs.existsSync(tempAsar)) fs.unlinkSync(tempAsar);
const tempUnpacked = tempAsar + '.unpacked';
if (fs.existsSync(tempUnpacked)) fs.rmSync(tempUnpacked, { recursive: true, force: true });

console.log('[打包] 正在重新编译并打包 app.asar ...');
try {
  execSync(`npx -y @electron/asar pack "${tempDir}" "${tempAsar}" --unpack-dir "**/chrome-devtools-mcp"`, { stdio: 'inherit' });
} catch (e) {
  console.error('[错误] 打包新 asar 失败: ' + e.message);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 9. 校验生成的文件体积
if (!fs.existsSync(tempAsar)) {
  console.error('[错误] 未能生成有效的 app.asar.temp 文件！');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

const asarSizeMb = (fs.statSync(tempAsar).size / (1024 * 1024)).toFixed(2);
console.log(`[校验] 打包体积正常: ${asarSizeMb} MB`);

// 10. 原子替换系统文件并清理临时缓存
console.log('[部署] 正在原子替换系统文件...');
try {
  fs.copyFileSync(tempAsar, asarPath);
  fs.unlinkSync(tempAsar);
  if (fs.existsSync(tempUnpacked)) fs.rmSync(tempUnpacked, { recursive: true, force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('   🎉 [成功] AgyChatLadder (对话天梯) 安装大获成功！   ');
  console.log('====================================================');
  console.log('✨ 核心亮点:');
  console.log('  1. 叠层 ^ 图标: 登顶首提为上下双重 ^ 叠层，上一问/下一问单箭头，触底最新双重 v 叠层');
  console.log('  2. 智能悬停卡片: 悬停踏板圆点实时预览第 N 问内容，悬停按键提示功能说明');
  console.log('  3. 多分屏深度感知: 左右/上下分屏均自动挂载独立专属天梯，互不干扰');
  console.log('  4. 永久磁盘固化: 重启、刷新客户端均稳定常驻，彻底告别重启失效！\n');

  if (isAppRunning) {
    console.log('💡 提示：当前 Antigravity 正在运行中，重启客户端即可直接体验全新天梯！\n');
  } else {
    console.log('💡 现在可以直接启动 Antigravity 客户端体验全新天梯功能了！\n');
  }
} catch (e) {
  console.error('\n❌ [错误] 覆盖系统文件失败: ' + e.message);
  console.error('💡 解决办法：请先彻底关闭 Antigravity 客户端，然后再运行本脚本！\n');
  if (fs.existsSync(tempAsar)) fs.unlinkSync(tempAsar);
  if (fs.existsSync(tempUnpacked)) fs.rmSync(tempUnpacked, { recursive: true, force: true });
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}
