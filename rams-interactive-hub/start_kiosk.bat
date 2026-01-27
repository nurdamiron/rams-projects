@echo off
:: RAMS Interactive Hub - Kiosk Startup Script (Windows)
:: Для автозапуска поместите в shell:startup

title RAMS Interactive Hub
echo ========================================
echo   RAMS Interactive Hub - Starting...
echo ========================================
echo.

cd /d "C:\RAMS\RAMS-App\rams-interactive-hub"

:: Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не найден!
    echo Установите Node.js LTS: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js найден
echo.

:: Проверка медиа папки
if not exist "C:\RAMS\RAMS-Media\projects" (
    echo [WARNING] Медиа папка не найдена: C:\RAMS\RAMS-Media\projects
    echo Приложение запустится, но медиа файлы не будут отображаться.
    echo.
)

:: Запуск Electron в режиме разработки (с киоском)
echo [START] Запуск приложения...
npm run electron:dev

pause
