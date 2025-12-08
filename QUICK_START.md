# Quick Start Guide

## Current Status
Your app is now using a test HLS stream so you can test quality selection immediately!

## To Use Your Own Video:

### Step 1: Convert Your Video
Run this in PowerShell:
```powershell
.\convert-to-hls.ps1 -InputFile "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4"
```

Or if you have a local file:
```powershell
.\convert-to-hls.ps1 -InputFile "C:\path\to\your\video.mp4"
```

**Wait for conversion to complete** (may take 5-10 minutes depending on video size)

### Step 2: Start the Server
Once conversion is done, start the server:

**Option A - Using npm:**
```powershell
npm run serve-hls
```

**Option B - Using Python:**
```powershell
cd hls_output
python -m http.server 8000
```

**Option C - Using batch file:**
```powershell
.\start-hls-server.bat
```

### Step 3: Update App.js
Change line 8 in `src/App.js`:
```javascript
// Comment out the test stream:
// const videoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Uncomment your local server:
const videoUrl = 'http://localhost:8000/master.m3u8';
```

### Step 4: Refresh Your Browser
The quality selector should now work with your converted video!

## Troubleshooting

**"ERR_CONNECTION_REFUSED":**
- Make sure the server is running on port 8000
- Check that `hls_output` folder exists
- Verify `master.m3u8` is in the `hls_output` folder

**Conversion taking too long:**
- This is normal for large videos
- Check the terminal for progress
- FFmpeg will show encoding progress

**No quality selector showing:**
- Make sure you're using an HLS stream (.m3u8)
- Check browser console for errors
- Verify the master.m3u8 file exists


