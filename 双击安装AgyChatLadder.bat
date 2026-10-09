@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AgyChatLadder (对话天梯) 一键安装器

echo ========================================================
echo       AgyChatLadder (对话天梯) 跨设备一键安装程序
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 运行环境！
    echo 请先安装 Node.js (https://nodejs.org/) 后再运行本安装器。
    echo.
    pause
    exit /b 1
)

echo [提示] 正在执行安装脚本，请稍候...
echo.
node "%~dp0install_chat_ladder.js"
echo.
pause
