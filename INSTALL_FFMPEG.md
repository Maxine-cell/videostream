# How to Install FFmpeg on Windows

## Option 1: Using Chocolatey (Easiest)

If you have Chocolatey installed:
```powershell
choco install ffmpeg -y
```

If you don't have Chocolatey, install it first:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Then install FFmpeg:
```powershell
choco install ffmpeg -y
```

## Option 2: Manual Installation

1. **Download FFmpeg:**
   - Go to: https://www.gyan.dev/ffmpeg/builds/
   - Download: `ffmpeg-release-essentials.zip`

2. **Extract and Add to PATH:**
   - Extract the zip file to `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to your system PATH:
     - Right-click "This PC" → Properties
     - Advanced System Settings → Environment Variables
     - Under "System variables", find "Path" → Edit
     - Click "New" → Add: `C:\ffmpeg\bin`
     - Click OK on all windows

3. **Verify Installation:**
   - Close and reopen PowerShell
   - Run: `ffmpeg -version`
   - You should see FFmpeg version information

## Option 3: Using winget (Windows 10/11)

```powershell
winget install ffmpeg
```

## After Installation

1. **Close and reopen PowerShell** (to refresh PATH)
2. **Verify FFmpeg works:**
   ```powershell
   ffmpeg -version
   ```
3. **Run your conversion:**
   ```powershell
   .\convert-to-hls.ps1 -InputFile "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4"
   ```

## Troubleshooting

**"ffmpeg is not recognized":**
- Make sure you closed and reopened PowerShell after installation
- Verify FFmpeg is in PATH: `$env:PATH -split ';' | Select-String ffmpeg`
- Try restarting your computer

**Still not working:**
- Try the full path: `C:\ffmpeg\bin\ffmpeg.exe -version`
- If that works, your PATH isn't set correctly

