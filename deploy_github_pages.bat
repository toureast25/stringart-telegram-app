@echo off
echo ============================================
echo РАЗВЁРТЫВАНИЕ НА GITHUB PAGES
echo ============================================
echo.

echo 1. Коммитим текущие изменения...
git add .
git commit -m "Prepare for GitHub Pages deployment"

echo.
echo 2. Отправляем на GitHub...
git push origin main

echo.
echo 3. Настройка GitHub Pages:
echo    - Откройте https://github.com/toureast25/stringart-telegram-app
echo    - Перейдите в Settings → Pages
echo    - В Source выберите "Deploy from a branch"
echo    - Выберите branch: main
echo    - Folder: / (root)
echo    - Нажмите Save
echo.
echo 4. Ваше приложение будет доступно по адресу:
echo    https://toureast25.github.io/stringart-telegram-app/
echo.
echo 5. Подождите 2-3 минуты для активации GitHub Pages
echo.

pause
