@echo off
echo Converting MP4 to HLS format...
echo.

REM Check if FFmpeg is installed
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: FFmpeg is not installed or not in PATH
    echo Please install FFmpeg from https://ffmpeg.org/download.html
    echo Or install via: choco install ffmpeg
    pause
    exit /b 1
)

REM Check if input file is provided
if "%~1"=="" (
    echo Usage: convert-to-hls.bat input.mp4
    echo.
    echo Example: convert-to-hls.bat video.mp4
    pause
    exit /b 1
)

set INPUT_FILE=%~1
set OUTPUT_DIR=hls_output
set IS_URL=0

REM Check if input is a URL (starts with http:// or https://)
echo %INPUT_FILE% | findstr /R "^http" >nul
if %ERRORLEVEL% EQU 0 (
    set IS_URL=1
    echo Detected URL input, FFmpeg will download it directly
) else (
    REM Check if input file exists (only for local files)
    if not exist "%INPUT_FILE%" (
        echo ERROR: Input file not found: %INPUT_FILE%
        pause
        exit /b 1
    )
)

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Input file: %INPUT_FILE%
echo Output directory: %OUTPUT_DIR%
echo.
echo Starting conversion (this may take a few minutes)...
echo.

REM Convert to HLS with multiple quality levels
ffmpeg -i "%INPUT_FILE%" ^
  -c:v libx264 -c:a aac ^
  -b:v:0 400k -b:v:1 800k -b:v:2 1500k -b:v:3 3000k ^
  -s:v:0 640x360 -s:v:1 854x480 -s:v:2 1280x720 -s:v:3 1920x1080 ^
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a ^
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" ^
  -master_pl_name master.m3u8 ^
  -f hls -hls_time 10 -hls_playlist_type vod ^
  -hls_segment_filename "%OUTPUT_DIR%/v%%v/segment_%%03d.ts" ^
  "%OUTPUT_DIR%/v%%v/playlist.m3u8"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Conversion completed successfully!
    echo ========================================
    echo.
    echo Output files are in: %OUTPUT_DIR%
    echo Master playlist: %OUTPUT_DIR%\master.m3u8
    echo.
    echo Next steps:
    echo 1. Start a local server in the %OUTPUT_DIR% folder
    echo 2. Use URL: http://localhost:8000/master.m3u8
    echo.
) else (
    echo.
    echo ERROR: Conversion failed!
    echo.
)

pause


