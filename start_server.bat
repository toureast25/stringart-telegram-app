@echo off
echo Starting StringArt Development Server...
echo.
echo Open your browser and go to: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% equ 0 goto :eof

REM Try Python 2 if Python 3 failed
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% equ 0 goto :eof

REM If Python is not available, try Node.js
npx http-server -p 8000 2>nul
if %errorlevel% equ 0 goto :eof

echo.
echo ERROR: No suitable server found!
echo Please install Python or Node.js to run the development server.
echo.
echo Alternatives:
echo 1. Install Python: https://python.org
echo 2. Install Node.js: https://nodejs.org
echo 3. Use VS Code with Live Server extension
echo.
pause
