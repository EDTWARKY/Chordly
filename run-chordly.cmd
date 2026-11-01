@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js was not found. Install Node.js 18 or newer from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Chordly dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Review the output above and try again.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Building and starting the Chordly Windows app...
echo Close the Chordly window to exit.
echo.
call npm run desktop
if errorlevel 1 pause
endlocal
