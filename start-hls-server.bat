@echo off
echo Starting local HTTP server for HLS files...
echo.

if not exist "hls_output" (
    echo ERROR: hls_output directory not found!
    echo Please run convert-to-hls.bat first to convert your video.
    pause
    exit /b 1
)

cd hls_output

echo Server starting on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

REM Try Python first
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python -m http.server 8000
    goto :end
)

REM Try Python 3
python3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python3 -m http.server 8000
    goto :end
)

REM Try Node.js http-server
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    npx http-server -p 8000 --cors
    goto :end
)

echo ERROR: No HTTP server found!
echo Please install one of:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
pause
exit /b 1

:end
cd ..


