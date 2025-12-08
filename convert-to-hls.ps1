# PowerShell script to convert MP4 to HLS with YouTube-style multi-quality pipeline
# Example usage: .\convert-to-hls.ps1 -InputFile "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4"
param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile
)

# Refresh PATH to pick up FFmpeg
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "YouTube-Style Multi-Quality HLS Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if FFmpeg is installed
$ffmpegPath = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegPath) {
    Write-Host "ERROR: FFmpeg is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install FFmpeg from https://ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host "Or install via: choco install ffmpeg" -ForegroundColor Yellow
    exit 1
}

$outputDir = "hls_output"

# Check if input is URL or local file
$isUrl = $InputFile -match "^https?://"

if ($isUrl) {
    Write-Host "Detected URL input: $InputFile" -ForegroundColor Green
    Write-Host "FFmpeg will download and convert directly..." -ForegroundColor Yellow
} else {
    if (-not (Test-Path $InputFile)) {
        Write-Host "ERROR: Input file not found: $InputFile" -ForegroundColor Red
        exit 1
    }
    Write-Host "Input file: $InputFile" -ForegroundColor Green
}

# Clean output directory
if (Test-Path $outputDir) {
    Write-Host "Cleaning existing output directory..." -ForegroundColor Yellow
    Remove-Item -Path $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outputDir | Out-Null
Write-Host "Output directory: $outputDir" -ForegroundColor Green
Write-Host ""

# Quality configurations matching YouTube standards
$qualities = @(
    @{name="360p"; height=360; width=640; videoBitrate="600k"; audioBitrate="96k"; bandwidth=696000},
    @{name="480p"; height=480; width=854; videoBitrate="1000k"; audioBitrate="128k"; bandwidth=1128000},
    @{name="720p"; height=720; width=1280; videoBitrate="2500k"; audioBitrate="192k"; bandwidth=2692000},
    @{name="1080p"; height=1080; width=1920; videoBitrate="5000k"; audioBitrate="192k"; bandwidth=5192000}
)

Write-Host "Starting multi-quality HLS conversion..." -ForegroundColor Yellow
Write-Host "This will create 4 quality renditions (360p, 480p, 720p, 1080p)" -ForegroundColor Yellow
Write-Host ""

$playlistEntries = @()

# Generate each quality level
foreach ($quality in $qualities) {
    $qualityDir = "$outputDir\$($quality.name)"
    New-Item -ItemType Directory -Path $qualityDir -Force | Out-Null
    
    $playlistFile = "$qualityDir\$($quality.name).m3u8"
    $segmentPattern = "$qualityDir\$($quality.name)_%03d.ts"
    
    Write-Host "Converting $($quality.name) ($($quality.width)x$($quality.height))..." -ForegroundColor Cyan
    
    # Build scale filter to ensure even dimensions
    $scaleFilter = "scale=trunc(iw*$($quality.height)/ih/2)*2:$($quality.height)"
    
    # FFmpeg command for HLS generation with proper settings
    $ffmpegArgs = @(
        "-i", "`"$InputFile`"",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-sc_threshold", "0",
        "-g", "48",
        "-keyint_min", "48",
        "-c:a", "aac",
        "-b:v", $quality.videoBitrate,
        "-maxrate", $quality.videoBitrate,
        "-bufsize", "$([int]($quality.videoBitrate -replace 'k','') * 2)k",
        "-b:a", $quality.audioBitrate,
        "-vf", $scaleFilter,
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", $segmentPattern,
        "-hls_flags", "independent_segments",
        "-f", "hls",
        $playlistFile
    )
    
    $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -ne 0) {
        Write-Host "ERROR: Failed to convert $($quality.name)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] $($quality.name) conversion complete" -ForegroundColor Green
    
    # Store playlist entry for master playlist
    $playlistEntries += @{
        path = "$($quality.name)/$($quality.name).m3u8"
        bandwidth = $quality.bandwidth
        resolution = "$($quality.width)x$($quality.height)"
        quality = $quality
    }
}

Write-Host ""
Write-Host "Creating master playlist (master.m3u8)..." -ForegroundColor Yellow

# Generate master playlist with proper HLS format
$masterPlaylist = "#EXTM3U`n#EXT-X-VERSION:3`n`n"

foreach ($entry in $playlistEntries) {
    $codecs = 'avc1.64001f,mp4a.40.2'
    $streamInfo = "#EXT-X-STREAM-INF:BANDWIDTH=$($entry.bandwidth),RESOLUTION=$($entry.resolution),CODECS=`"$codecs`""
    $masterPlaylist += $streamInfo + "`n"
    $masterPlaylist += "$($entry.path)`n`n"
}

$masterPlaylist | Out-File -FilePath "$outputDir\master.m3u8" -Encoding utf8 -NoNewline

Write-Host "[OK] Master playlist created" -ForegroundColor Green
Write-Host ""

# Verify structure
Write-Host "Verifying HLS structure..." -ForegroundColor Yellow
$allValid = $true

foreach ($quality in $qualities) {
    $playlistPath = "$outputDir\$($quality.name)\$($quality.name).m3u8"
    if (-not (Test-Path $playlistPath)) {
        Write-Host "[ERROR] Missing: $playlistPath" -ForegroundColor Red
        $allValid = $false
    } else {
        $segmentCount = (Get-ChildItem -Path "$outputDir\$($quality.name)" -Filter "*.ts").Count
        Write-Host "[OK] $($quality.name): $segmentCount segments" -ForegroundColor Green
    }
}

if (-not (Test-Path "$outputDir\master.m3u8")) {
    Write-Host "[ERROR] Missing: master.m3u8" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

if ($allValid) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Conversion completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generated structure:" -ForegroundColor Cyan
    Write-Host "  hls_output/" -ForegroundColor White
    Write-Host "    +-- master.m3u8" -ForegroundColor White
    Write-Host "    +-- 360p/" -ForegroundColor White
    Write-Host "    |   +-- 360p.m3u8" -ForegroundColor White
    Write-Host "    |   +-- 360p_*.ts (segments)" -ForegroundColor White
    Write-Host "    +-- 480p/" -ForegroundColor White
    Write-Host "    |   +-- 480p.m3u8" -ForegroundColor White
    Write-Host "    |   +-- 480p_*.ts (segments)" -ForegroundColor White
    Write-Host "    +-- 720p/" -ForegroundColor White
    Write-Host "    |   +-- 720p.m3u8" -ForegroundColor White
    Write-Host "    |   +-- 720p_*.ts (segments)" -ForegroundColor White
    Write-Host "    +-- 1080p/" -ForegroundColor White
    Write-Host "        +-- 1080p.m3u8" -ForegroundColor White
    Write-Host "        +-- 1080p_*.ts (segments)" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Start HLS server: npm run serve-hls" -ForegroundColor White
    Write-Host "2. Or run: .\start-hls-server.bat" -ForegroundColor White
    Write-Host "3. Use URL: http://localhost:8000/master.m3u8" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERROR: Conversion completed with errors!" -ForegroundColor Red
    Write-Host "Please check the output above for missing files." -ForegroundColor Yellow
    exit 1
}
