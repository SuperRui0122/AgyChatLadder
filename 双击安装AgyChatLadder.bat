@echo off
chcp 65001 >nul
title AgyChatLadder (对话天梯) 跨设备一键安装器

echo ========================================================
echo       AgyChatLadder (对话天梯) 跨设备一键安装程序
echo ========================================================
echo.
echo [说明] 本程序将为本机的 Google Antigravity 客户端自动注入
echo        右侧四级长对话天梯导航与微型时间轴组件。
echo.

:: 1. 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 运行环境！
    echo 请先安装 Node.js (https://nodejs.org/) 后再运行本安装器。
    echo.
    pause
    exit /b 1
)

:: 2. 检查并提示关闭 Antigravity (避免文件锁定)
tasklist /fi "imagename eq Antigravity.exe" 2>nul | find /i "Antigravity.exe" >nul
if %errorlevel% equ 0 (
    echo [提示] 检测到 Antigravity 客户端正在运行！
    echo 为防止系统文件锁定导致安装失败，建议关闭 Antigravity 后继续。
    echo.
    echo 请选择操作：
    echo [1] 自动关闭 Antigravity 并继续安装
    echo [2] 我已手动保存，直接继续尝试安装
    echo [3] 退出安装
    echo.
    set /p choice="请输入数字 [1/2/3] (默认1): "
    if "%choice%"=="" set choice=1
    if "%choice%"=="1" (
        echo 正在优雅关闭 Antigravity...
        taskkill /f /im Antigravity.exe >nul 2>nul
        timeout /t 2 /nobreak >nul
    ) else if "%choice%"=="3" (
        echo 安装已取消。
        exit /b 0
    )
)

echo.
echo [开始] 正在执行安装脚本...
echo.

node "%~dp0install_chat_ladder.js"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo      🎉 AgyChatLadder 安装大获成功！
    echo ========================================================
    echo 现在可以启动 Antigravity 体验四级对话天梯功能了。
) else (
    echo.
    echo [失败] 安装过程中遇到错误，请查看上方提示信息。
)

echo.
pause
