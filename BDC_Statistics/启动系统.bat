@echo off
title BDC统计系统启动工具
echo ========================================
echo BDC统计系统启动和诊断工具
echo ========================================
echo.

echo 1. 检查后端服务状态...
curl -s http://localhost:3001/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 后端服务已在运行
    goto :check_frontend
)

echo   后端服务未运行，正在启动后端服务...
cd backend
start "BDC后端服务" cmd /k "npm start"
timeout /t 3 > nul

:check_frontend
echo.
echo 2. 检查前端服务状态...
curl -s http://localhost:5173 > nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 前端服务已在运行
    goto :diagnose
)

echo   前端服务未运行，正在启动前端服务...
cd ..\frontend
start "BDC前端服务" cmd /k "npm run dev"
timeout /t 5 > nul

:diagnose
echo.
echo 3. 系统诊断...
cd ..

echo   检查数据库连接...
curl -s http://localhost:3001/api/statistics > nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 数据库连接正常
) else (
    echo ✗ 数据库连接失败
)

echo.
echo 4. 打开系统页面...
start http://localhost:5173

echo.
echo ========================================
echo 系统启动完成！
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo ========================================
echo.
echo 如果仍有数据问题，请运行: 系统诊断.bat
pause