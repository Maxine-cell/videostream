# Script to download and install FFmpeg
Write-Host "Installing FFmpeg..." -ForegroundColor Cyan

$ffmpegDir = "C:\ffmpeg"
$ffmpegBin = "$ffmpegDir\bin"
$downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$zipFile = "$env:TEMP\ffmpeg.zip"

# Check if already installed
if (Test-Path "$ffmpegBin\ffmpeg.exe") {
    Write-Host "FFmpeg already exists at $ffmpegBin" -ForegroundColor Green
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    
    # Add to user PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$ffmpegBin*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$ffmpegBin", "User")
        Write-Host "Added $ffmpegBin to PATH" -ForegroundColor Green
    }
    
    Write-Host "Please close and reopen PowerShell, then run: ffmpeg -version" -ForegroundColor Yellow
    exit 0
}

# Create directory
if (-not (Test-Path $ffmpegDir)) {
    New-Item -ItemType Directory -Path $ffmpegDir | Out-Null
}

Write-Host "Downloading FFmpeg (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "URL: $downloadUrl" -ForegroundColor Gray

try {
    # Download FFmpeg
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
    
    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $zipFile -DestinationPath $env:TEMP -Force
    
    # Find the extracted folder
    $extractedFolder = Get-ChildItem -Path $env:TEMP -Filter "ffmpeg-*" -Directory | Select-Object -First 1
    
    if ($extractedFolder) {
        # Move contents to C:\ffmpeg
        Move-Item -Path "$($extractedFolder.FullName)\*" -Destination $ffmpegDir -Force
        Remove-Item -Path $extractedFolder.FullName -Force
        Write-Host "Extraction complete!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Could not find extracted folder" -ForegroundColor Red
        exit 1
    }
    
    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$ffmpegBin*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$ffmpegBin", "User")
        Write-Host "Added $ffmpegBin to PATH" -ForegroundColor Green
    }
    
    # Refresh current session PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify installation
    if (Test-Path "$ffmpegBin\ffmpeg.exe") {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "FFmpeg installed successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Location: $ffmpegBin" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Testing installation..." -ForegroundColor Yellow
        & "$ffmpegBin\ffmpeg.exe" -version | Select-Object -First 3
        Write-Host ""
        Write-Host "You can now run the conversion script!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Installation may have failed" -ForegroundColor Red
        exit 1
    }
    
    # Cleanup
    Remove-Item -Path $zipFile -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor White
    Write-Host "2. Extract to: C:\ffmpeg" -ForegroundColor White
    Write-Host "3. Add C:\ffmpeg\bin to your system PATH" -ForegroundColor White
    exit 1
}

