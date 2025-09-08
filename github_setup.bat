@echo off
echo "Setting up GitHub repository..."
git remote add origin https://github.com/toureast25/stringart-telegram-app.git
echo "Remote added successfully"
git branch -M main
echo "Branch renamed to main"
git push -u origin main
echo "Code pushed to GitHub successfully!"
pause
