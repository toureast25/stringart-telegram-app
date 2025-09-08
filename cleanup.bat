@echo off
echo ============================================
echo ОЧИСТКА ЛИШНИХ ФАЙЛОВ
echo ============================================
echo.

echo Удаляем старый монолитный файл...
if exist "stringify.html" (
    del "stringify.html"
    echo ✓ stringify.html удален
) else (
    echo - stringify.html не найден
)

echo.
echo Удаляем временные batch файлы...
if exist "start_server.bat" (
    del "start_server.bat"
    echo ✓ start_server.bat удален
)
if exist "commit_and_push.bat" (
    del "commit_and_push.bat"
    echo ✓ commit_and_push.bat удален
)
if exist "simple_commit.bat" (
    del "simple_commit.bat"
    echo ✓ simple_commit.bat удален
)
if exist "github_setup.bat" (
    del "github_setup.bat"
    echo ✓ github_setup.bat удален
)
if exist "check_files.bat" (
    del "check_files.bat"
    echo ✓ check_files.bat удален
)
if exist "h.bat" (
    del "h.bat"
    echo ✓ h.bat удален
)

echo.
echo Удаляем артефакты команд...
if exist "tatus" (
    del "tatus"
    echo ✓ tatus удален
)
if exist "t" (
    del "t"
    echo ✓ t удален
)

echo.
echo ============================================
echo ОЧИСТКА ЗАВЕРШЕНА!
echo ============================================
echo.
echo Оставшиеся файлы:
dir /b

echo.
echo Теперь папка содержит только нужные файлы для проекта.
echo.

REM Удаляем этот файл последним
del "cleanup.bat"

pause
