@echo off
echo Committing modular refactoring changes...
echo.

REM Добавляем все изменения
git add .

REM Создаём коммит с описанием
git commit -m "Refactor: Split monolithic HTML into modular structure

- Split stringify.html into separate modules:
  * index.html - main HTML structure
  * assets/js/app.js - main application logic
  * assets/js/imageProcessor.js - image loading and processing
  * assets/js/colorAnalyzer.js - color extraction and clustering
  * assets/js/actualColors.js - actual colors mapping and management
  * assets/js/stringartGenerator.js - StringArt pattern generation
  * assets/js/telegramAPI.js - Telegram Mini App integration
  * assets/js/utils.js - utility functions
  * assets/css/main.css - main styles
  * assets/css/components.css - component styles
  * manifest.json - Telegram Mini App configuration

- Fixed missing functionality from original file:
  * Restored default image loading with fallback
  * Added actual colors module with full mapping functionality
  * Fixed background color settings and edge detection
  * Restored all event handlers and UI interactions

- Improved code organization for better maintainability
- Prepared structure for Telegram Mini App deployment"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo Done! All changes committed and pushed to GitHub.
echo Check your repository at: https://github.com/toureast25/stringart-telegram-app
pause
