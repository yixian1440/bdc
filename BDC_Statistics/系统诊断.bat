@echo off
echo ========================================
echo BDC统计系统诊断工具
echo ========================================
echo.

echo 1. 检查后端服务状态...
curl -s http://localhost:3001/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 后端服务运行正常
) else (
    echo ✗ 后端服务未运行，请启动后端服务
    echo   启动命令: cd backend && npm start
    goto :end
)

echo.
echo 2. 检查数据库连接...
curl -s http://localhost:3001/api/statistics > nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 数据库连接正常
) else (
    echo ✗ 数据库连接失败，请检查数据库配置
)

echo.
echo 3. 检查API接口状态...
echo   健康检查接口: http://localhost:3001/health
curl -s http://localhost:3001/health
echo.
echo   统计接口: http://localhost:3001/api/statistics
curl -s http://localhost:3001/api/statistics
echo.
echo   推荐收件人接口: http://localhost:3001/api/recommended-receivers
curl -s http://localhost:3001/api/recommended-receivers

echo.
echo 4. 检查前端API配置...
type "frontend\src\services\api.js" | findstr "baseURL"
type "frontend\src\services\api.js" | findstr "getRecommendedReceivers"

:end
echo.
echo ========================================
echo 诊断完成
echo ========================================
pause