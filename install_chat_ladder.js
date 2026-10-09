const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('   AgyChatLadder (对话天梯) 跨平台一键安装器 v1.0.0    ');
console.log('====================================================\n');

// 1. 自动探测 Antigravity 安装目录
function detectInstallDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (process.platform === 'win32') {
    const defaultWin = path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Programs', 'antigravity');
    if (fs.existsSync(defaultWin)) return defaultWin;
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
console.log('[探测] 成功识别到安装路径: ' + installDir);

// 2. 定位 resources 目录
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

// 3. 安全备份
if (!fs.existsSync(bakPath)) {
  console.log('[备份] 正在创建官方原始备份: app.asar.bak ...');
  fs.copyFileSync(asarPath, bakPath);
  console.log('[备份] 备份创建成功！');
} else {
  console.log('[备份] 已存在历史备份文件，跳过备份。');
}

// 4. 解包
const tempDir = path.join(__dirname, '_temp_unpack');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });

console.log('[解包] 正在使用 asar 提取 app.asar ...');
try {
  execSync(`npx -y @electron/asar extract "${asarPath}" "${tempDir}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('[错误] 解包失败，请检查是否已安装 Node.js 和网络环境。');
  process.exit(1);
}

// 5. 注入 AgyChatLadder 核心代码到 preload.js
const preloadPath = path.join(tempDir, 'dist', 'preload.js');
if (!fs.existsSync(preloadPath)) {
  console.error('[错误] 解包后未找到 dist/preload.js');
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

// 幂等清理旧版注入
const cleanPatterns = [
  /\/\* --- AGY CHAT LADDER TIMELINE ENGINE --- \*\/[\s\S]*?\/\* --- LADDER END --- \*\//g,
  /\/\* --- AGY CHAT LADDER START --- \*\/[\s\S]*?\/\* --- AGY CHAT LADDER END --- \*\//g,
  /\/\* --- VOYAGER TIMELINE NAVIGATOR --- \*\/[\s\S]*?\/\* --- VOYAGER END --- \*\//g
];
cleanPatterns.forEach(pattern => {
  preloadContent = preloadContent.replace(pattern, '');
});

const LADDER_MARKER = '/* --- AGY CHAT LADDER TIMELINE ENGINE --- */';
const injectPayload = `\n\n${LADDER_MARKER}\n${ladderCode}\n/* --- LADDER END --- */\n`;
preloadContent += injectPayload;
fs.writeFileSync(preloadPath, preloadContent, 'utf-8');

// 语法检查门禁
try {
  execSync(`node --check "${preloadPath}"`);
  console.log('[门禁] preload.js 语法校验 100% 通过！');
} catch (e) {
  console.error('[错误] 注入后语法检查未通过，已中止安装。');
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 6. 重新打包
const tempAsar = path.join(__dirname, 'app.asar.temp');
if (fs.existsSync(tempAsar)) fs.unlinkSync(tempAsar);

console.log('[打包] 正在重新编译并打包 app.asar ...');
try {
  execSync(`npx -y @electron/asar pack "${tempDir}" "${tempAsar}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('[错误] 打包新 asar 失败: ' + e.message);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}

// 7. 部署并清理
console.log('[部署] 正在原子替换系统文件...');
try {
  fs.copyFileSync(tempAsar, asarPath);
  fs.unlinkSync(tempAsar);
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('\n🎉 [成功] AgyChatLadder (对话天梯) 已在当前设备上成功安装！');
  console.log('💡 重新启动 Antigravity 客户端即可享受全新的右侧四级天梯导航！\n');
} catch (e) {
  console.error('[错误] 覆盖文件失败 (请先退出正在运行的 Antigravity 客户端): ' + e.message);
}
