#!/usr/bin/env bash
# ========================================================
#       AgyChatLadder (对话天梯) macOS / Linux 一键安装程序
# ========================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================================"
echo "      AgyChatLadder (对话天梯) 跨设备一键安装程序"
echo "========================================================"
echo ""

# 1. 检查 Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)！"
    exit 1
fi

# 2. 检查客户端进程
if pgrep -f "Antigravity" >/dev/null 2>&1; then
    echo "[提示] 检测到 Antigravity 客户端正在运行。"
    echo "为避免 app.asar 文件占用导致写入失败，建议先关闭 Antigravity。"
    read -p "是否自动关闭 Antigravity 客户端？[Y/n]: " choice
    choice=${choice:-Y}
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        pkill -f "Antigravity" || true
        sleep 2
    fi
fi

# 3. 运行注入脚本
echo ""
echo "[开始] 正在执行注入脚本..."
echo ""

node "$DIR/install_chat_ladder.js"

echo ""
echo "========================================================"
echo "   🎉 AgyChatLadder (对话天梯) 安装完成！"
echo "========================================================"
echo "现在可以启动 Antigravity 客户端使用了。"
