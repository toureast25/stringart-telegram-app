@echo off
echo Adding all changes...
git add .

echo Creating commit...
git commit -m "Modular refactoring: Split into separate JS modules and CSS files"

echo Pushing to GitHub...
git push origin main

echo Done!
pause
