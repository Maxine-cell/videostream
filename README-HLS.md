# How to Convert MP4 to HLS and Test Quality Selection

## Quick Start

### Step 1: Convert Your MP4 to HLS

**Windows:**
```bash
convert-to-hls.bat your-video.mp4
```

**Mac/Linux:**
```bash
chmod +x convert-to-hls.sh
./convert-to-hls.sh your-video.mp4
```

This will create a `hls_output` folder with:
- `master.m3u8` - Master playlist (use this URL)
- `v0/`, `v1/`, `v2/`, `v3/` - Quality level folders (360p, 480p, 720p, 1080p)

### Step 2: Start Local Server

**Option A - Using npm script:**
```bash
npm run serve-hls
```

**Option B - Using Python:**
```bash
cd hls_output
python -m http.server 8000
```

**Option C - Using batch file (Windows):**
```bash
start-hls-server.bat
```

### Step 3: Update App.js

The app is already configured to use: `http://localhost:8000/master.m3u8`

Just make sure:
1. Your conversion is complete
2. Local server is running on port 8000
3. Start your React app: `npm start`

## Requirements

- **FFmpeg** must be installed and in your PATH
  - Windows: Download from https://ffmpeg.org/download.html or `choco install ffmpeg`
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`

## Troubleshooting

**FFmpeg not found:**
- Make sure FFmpeg is installed
- Add FFmpeg to your system PATH

**Server won't start:**
- Make sure port 8000 is available
- Try a different port: `python -m http.server 8080`
- Update the URL in App.js accordingly

**Video won't play:**
- Check browser console for errors
- Make sure all files are in `hls_output` folder
- Verify `master.m3u8` exists
- Check CORS if serving from different origin

## Testing Without Conversion

To test quality selection immediately, use this test HLS stream in `App.js`:
```javascript
const videoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
```


