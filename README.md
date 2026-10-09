# 🪜 AgyChatLadder (对话天梯)

<p align="center">
  <strong>Antigravity 专属长对话微型时间轴与四级天梯导航引擎</strong><br>
  <em>A lightweight four-tier conversation timeline & navigation engine for Google Antigravity.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Release-v1.0.0-brightgreen.svg" alt="Release">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-orange.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/PRs-welcome-purple.svg" alt="PRs Welcome">
</p>

---

## 📖 简介 (Introduction)

在使用 **Google Antigravity** 进行高强度深度对话或代码生成时，随着上下文增长，页面往往产生数十轮对话与海量代码块，回滚翻找历史提问极其痛苦。

**AgyChatLadder (对话天梯)** 专为解决长会话翻阅痛点而生：
- 摒弃了传统 Voyager 插件臃肿、闪烁弹窗遮挡、定位漂移的缺陷。
- 采用极简的毛玻璃微型轨道与 **四级天梯按键**（首问、上问、下问、最新），如同为长对话搭建了一部轻盈顺滑的天梯！
- 踏板位置以 **温润翠绿静态常亮** 显示，绝无晃眼动画，带来极致清爽的视觉沉浸感。

---

## ✨ 核心特性 (Features)

| 特性 | 说明 |
| :--- | :--- |
| **🪜 四级天梯按键** | `▲▲` 登顶首提 · `▲` 攀升上一问 · `▼` 下探下一问 · `▼▼` 触底最新 |
| **🎯 像素级精准定位** | 原生穿透 Antigravity CSS 隔离视口（`.overflow-y-auto.isolate`），计算绝对 `offsetTop`，让每次跳转都将**提问与回答置顶呈现** |
| **🌿 静态翠绿踏板** | 当前所在轮次以经典翠绿色（`#10b981`）静态高亮，彻底消除持续闪烁或跑马灯特效 |
| **🚫 告别气泡遮挡** | 彻底移除浮夸文本悬浮窗，不遮挡主对话任何代码或界面元素 |
| **💎 毛玻璃极简美学** | 悬浮贴合在右侧边缘，鼠标移出时自动降低透明度，静如空气，动若天梯 |
| **🛡️ 异步容错挂载** | 阶梯式异步定时器 + MutationObserver 监听，完美兼容 Electron 冷启动与会话切换 |

---

## 📂 项目结构 (Project Structure)

```text
AgyChatLadder/
├── chat_ladder_core.js         # 纯原生轻量核心引擎（零第三方依赖）
├── install_chat_ladder.js      # 跨平台自动化注入程序 (Windows / macOS / Linux)
├── 双击安装AgyChatLadder.bat    # Windows 一键安装批处理脚本
├── install_chat_ladder.sh      # macOS / Linux 一键安装 Shell 脚本
├── AgyChatLadder.user.js       # 油猴插件版 (Tampermonkey / 浏览器端)
├── package.json                # 工程配置文件
├── LICENSE                     # MIT 开源许可证
└── README.md                   # 项目使用与部署文档
```

---

## 🚀 快速安装 (Quick Start)

### 方式一：Windows 设备一键安装（推荐）
1. 确保电脑已安装 [Node.js](https://nodejs.org/)（LTS 版本即可）。
2. 下载或克隆本项目：
   ```bash
   git clone https://github.com/SuperRui0122/AgyChatLadder.git
   cd AgyChatLadder
   ```
3. **鼠标双击运行 `双击安装AgyChatLadder.bat`**。
4. 脚本将自动识别 Antigravity 安装目录、备份官方原包并注入天梯引擎。
5. 提示安装成功后，打开或重启 Antigravity 客户端即可享受天梯导航！

---

### 方式二：macOS / Linux 一键安装
1. 打开终端（Terminal）进入项目目录：
   ```bash
   cd AgyChatLadder
   chmod +x install_chat_ladder.sh
   ./install_chat_ladder.sh
   ```
2. 重启 Antigravity 客户端即可生效。

---

### 方式三：开发者工具临时免安装注入（调试 / Web 版）
如果你在没有 Node.js 的公共电脑上，或正在使用 Web 网页版 Antigravity：
1. 在 Antigravity 界面按下快捷键 `Ctrl + Shift + I`（Mac 为 `Cmd + Option + I`）打开开发者工具。
2. 切换至 **Console（控制台）** 标签页。
3. 打开本项目中的 [`chat_ladder_core.js`](chat_ladder_core.js)，全选复制全部内容并粘贴至控制台中回车运行。
4. 天梯导航即刻就绪！

---

### 方式四：浏览器油猴插件（Userscript）
若通过浏览器访问 Antigravity Web 前端：
1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 插件。
2. 安装或导入本项目中的 [`AgyChatLadder.user.js`](AgyChatLadder.user.js) 脚本即可。

---

## 🔄 卸载与恢复 (Uninstall & Revert)

安装器在首次运行注入前，会在 Antigravity 的 `resources` 目录下自动生成官方原始备份：`app.asar.bak`。

如需彻底还原至官方出厂状态：
- **Windows**：进入目录 `%LOCALAPPDATA%\Programs\antigravity\resources\`，删除 `app.asar`，将 `app.asar.bak` 改回 `app.asar` 即可。
- **macOS**：进入目录 `/Applications/Antigravity.app/Contents/Resources/`，将 `app.asar.bak` 恢复为 `app.asar` 即可。

---

## 🤝 参与贡献 (Contributing)

欢迎提交 Issue 与 Pull Request！
1. Fork 本仓库
2. 新建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 发起 Pull Request

---

## 📄 开源许可证 (License)

本项目采用 [MIT License](LICENSE) 开源许可证。
