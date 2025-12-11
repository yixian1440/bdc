@echo off
title BDC系统一键启动登录
echo ========================================
echo BDC统计系统一键启动和登录
echo ========================================
echo.

echo 1. 检查并启动后端服务...
curl -s http://localhost:3001/health > nul 2>&1
if %errorlevel% neq 0 (
    echo   启动后端服务...
    cd backend
    start "BDC后端服务" cmd /k "npm start"
    timeout /t 5 > nul
    cd ..
) else (
    echo ✓ 后端服务已在运行
)

echo.
echo 2. 检查并启动前端服务...
curl -s http://localhost:5173 > nul 2>&1
if %errorlevel% neq 0 (
    echo   启动前端服务...
    cd frontend
    start "BDC前端服务" cmd /k "npm run dev"
    timeout /t 8 > nul
    cd ..
) else (
    echo ✓ 前端服务已在运行
)

echo.
echo 3. 等待服务完全启动...
timeout /t 3 > nul

echo.
echo 4. 打开系统登录页面...
start http://localhost:5173/login

echo.
echo ========================================
echo 系统启动完成！
echo.
echo 请使用以下账户登录：
echo   用户名: guyongbiao
echo   密码: 123456
echo.
echo 其他可用账户：
echo   - yangmiaomiao / 123456
echo   - tongzhaoyi / 123456  
echo   - yanghaiyi / 123456
echo   - admin / 123456
echo ========================================
echo.
echo 如果登录后无数据，请运行：自动登录测试.bat
pause