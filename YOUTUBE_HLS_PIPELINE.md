# YouTube-Style Multi-Quality HLS Pipeline

Complete implementation guide for a production-ready YouTube-style video streaming system with adaptive bitrate streaming.

## 📁 Generated Folder Structure

After conversion, your `hls_output` directory will have this structure:

```
hls_output/
├── master.m3u8                    # Master playlist (entry point)
├── 360p/
│   ├── 360p.m3u8                 # Variant playlist for 360p
│   ├── 360p_000.ts                # Video segments
│   ├── 360p_001.ts
│   ├── 360p_002.ts
│   └── ... (more segments)
├── 480p/
│   ├── 480p.m3u8                 # Variant playlist for 480p
│   ├── 480p_000.ts
│   ├── 480p_001.ts
│   └── ... (more segments)
├── 720p/
│   ├── 720p.m3u8                 # Variant playlist for 720p
│   ├── 720p_000.ts
│   ├── 720p_001.ts
│   └── ... (more segments)
└── 1080p/
    ├── 1080p.m3u8                # Variant playlist for 1080p
    ├── 1080p_000.ts
    ├── 1080p_001.ts
    └── ... (more segments)
```

## 🎬 FFmpeg Commands Used

The conversion script generates 4 quality levels. Here are the equivalent FFmpeg commands:

### 360p (Low Quality)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -sc_threshold 0 \
  -g 48 \
  -keyint_min 48 \
  -c:a aac \
  -b:v 600k \
  -maxrate 600k \
  -bufsize 1200k \
  -b:a 96k \
  -vf scale=640:360:force_original_aspect_ratio=decrease \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "360p/360p_%03d.ts" \
  -hls_flags independent_segments \
  -f hls \
  360p/360p.m3u8
```

### 480p (Medium Quality)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -sc_threshold 0 \
  -g 48 \
  -keyint_min 48 \
  -c:a aac \
  -b:v 1000k \
  -maxrate 1000k \
  -bufsize 2000k \
  -b:a 128k \
  -vf scale=854:480:force_original_aspect_ratio=decrease \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "480p/480p_%03d.ts" \
  -hls_flags independent_segments \
  -f hls \
  480p/480p.m3u8
```

### 720p (HD Quality)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -sc_threshold 0 \
  -g 48 \
  -keyint_min 48 \
  -c:a aac \
  -b:v 2500k \
  -maxrate 2500k \
  -bufsize 5000k \
  -b:a 192k \
  -vf scale=1280:720:force_original_aspect_ratio=decrease \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "720p/720p_%03d.ts" \
  -hls_flags independent_segments \
  -f hls \
  720p/720p.m3u8
```

### 1080p (Full HD Quality)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -sc_threshold 0 \
  -g 48 \
  -keyint_min 48 \
  -c:a aac \
  -b:v 5000k \
  -maxrate 5000k \
  -bufsize 10000k \
  -b:a 192k \
  -vf scale=1920:1080:force_original_aspect_ratio=decrease \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "1080p/1080p_%03d.ts" \
  -hls_flags independent_segments \
  -f hls \
  1080p/1080p.m3u8
```

## 📋 Master Playlist Format

The `master.m3u8` file follows HLS specification:

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=696000,RESOLUTION=640x360,CODECS="avc1.64001f,mp4a.40.2"
360p/360p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1128000,RESOLUTION=854x480,CODECS="avc1.64001f,mp4a.40.2"
480p/480p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2692000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5192000,RESOLUTION=1920x1080,CODECS="avc1.64001f,mp4a.40.2"
1080p/1080p.m3u8
```

## 🚀 Quick Start

### Step 1: Convert Your Video

```powershell
.\convert-to-hls.ps1 -InputFile "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4"
```

Or with a local file:
```powershell
.\convert-to-hls.ps1 -InputFile "C:\path\to\your\video.mp4"
```

### Step 2: Start the HLS Server

**Option A - Production Server (Recommended):**
```powershell
npm run serve-hls
```

**Option B - Simple Server:**
```powershell
npm run serve-hls-simple
```

**Option C - Batch File:**
```powershell
.\start-hls-server.bat
```

### Step 3: Start React App

```powershell
npm start
```

The app will automatically load `http://localhost:8000/master.m3u8`

## 🎨 YouTube-Style Player Features

### Integrated Controls
- **Play/Pause Button**: Click video or button to play/pause
- **Progress Bar**: Click to seek, shows current position
- **Volume Control**: Hover over volume button to adjust
- **Time Display**: Shows current time / total duration
- **Settings Menu**: Gear icon opens quality selector
- **Fullscreen**: Fullscreen button for immersive viewing

### Quality Selection
- **Auto Mode**: Automatically selects best quality based on network
- **Manual Selection**: Click settings (⚙) to choose:
  - Auto
  - 1080p
  - 720p
  - 480p
  - 360p

### Adaptive Bitrate Streaming
- Automatically switches quality based on:
  - Network bandwidth
  - Buffer health
  - Device capabilities
- Manual override available via settings menu

## 🔧 Technical Details

### HLS Settings Explained

**`-hls_time 6`**: Each segment is 6 seconds long
- Shorter segments = faster quality switching
- Longer segments = less overhead, better compression

**`-hls_playlist_type vod`**: Video on Demand
- Playlist doesn't change after creation
- Suitable for pre-recorded videos

**`-hls_flags independent_segments`**: 
- Each segment can be decoded independently
- Better for seeking and quality switching

**`-g 48` and `-keyint_min 48`**:
- Keyframe every 48 frames (2 seconds at 24fps)
- Ensures segments start with keyframes

**`-preset medium`**:
- Balance between encoding speed and file size
- Options: ultrafast, fast, medium, slow, veryslow

**`-crf 23`**:
- Constant Rate Factor for quality
- Lower = better quality, larger files
- Range: 18-28 (23 is default)

### Bitrate Configuration

| Quality | Resolution | Video Bitrate | Audio Bitrate | Total Bandwidth |
|--------|------------|---------------|---------------|-----------------|
| 360p   | 640x360    | 600 kbps      | 96 kbps       | 696 kbps        |
| 480p   | 854x480    | 1000 kbps     | 128 kbps      | 1128 kbps       |
| 720p   | 1280x720   | 2500 kbps     | 192 kbps      | 2692 kbps       |
| 1080p  | 1920x1080  | 5000 kbps     | 192 kbps      | 5192 kbps       |

## 🌐 Server Configuration

### MIME Types
The server (`server.js`) automatically sets correct MIME types:
- `.m3u8` → `application/vnd.apple.mpegurl`
- `.ts` → `video/mp2t`

### CORS Headers
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- Allows cross-origin requests from React app

### Cache Control
- **Playlists (`.m3u8`)**: No cache (always fresh)
- **Segments (`.ts`)**: Cache for 1 hour

## 📊 Architecture Changes

### Before (Single MP4)
```
App.js → Direct MP4 URL → Native HTML5 Player
```
- No quality selection
- No adaptive streaming
- Single file download

### After (HLS Multi-Quality)
```
App.js → master.m3u8 → HLS.js → Adaptive Quality Selection
         ↓
    Quality Levels (360p, 480p, 720p, 1080p)
         ↓
    Segmented .ts files
```

## 🔍 Component Updates

### HLSPlayer.jsx
**Changes:**
- Removed separate quality selector below video
- Added integrated YouTube-style controls
- Settings menu with quality options
- Custom progress bar and time display
- Volume control
- Fullscreen support

**Features:**
- Auto quality detection and switching
- Manual quality override
- Smooth quality transitions
- Error recovery

### Server Configuration
**New Files:**
- `server.js`: Production-ready Node.js server with proper MIME types

**Updated Files:**
- `package.json`: Added `serve-hls` script
- `start-hls-server.bat`: Updated for CORS support

## 🐛 Troubleshooting

### Video Won't Load
1. Check server is running: `npm run serve-hls`
2. Verify `master.m3u8` exists in `hls_output/`
3. Check browser console for CORS errors
4. Verify all quality folders exist

### Quality Selector Not Showing
1. Ensure you're using an HLS stream (`.m3u8`)
2. Check that multiple quality levels were generated
3. Verify `hls.js` is loaded correctly

### Segments Not Loading
1. Check all `.ts` files are in correct folders
2. Verify MIME types are set correctly
3. Check network tab for 404 errors
4. Ensure CORS headers are present

## 📝 Production Deployment

### For Production:
1. **Use CDN**: Serve HLS files from CDN (CloudFront, Cloudflare)
2. **HTTPS**: HLS requires HTTPS in production
3. **Optimize Encoding**: Use `-preset slow` for better compression
4. **Monitor Bandwidth**: Track usage per quality level
5. **Error Handling**: Implement retry logic for failed segments

### Recommended CDN Settings:
- Enable HTTP/2
- Set proper cache headers
- Enable compression for playlists
- Use geographic distribution

## ✅ Verification Checklist

- [x] 4 quality levels generated (360p, 480p, 720p, 1080p)
- [x] Master playlist includes all qualities
- [x] Each quality has its own folder and playlist
- [x] Segments are properly named and numbered
- [x] Server serves files with correct MIME types
- [x] CORS headers are configured
- [x] Player shows quality selector in settings menu
- [x] Adaptive bitrate streaming works
- [x] Manual quality selection works
- [x] Fullscreen mode works
- [x] Progress bar and controls function correctly

## 🎯 Summary

This implementation provides:
- ✅ YouTube-style multi-quality HLS pipeline
- ✅ Proper folder structure with quality-named directories
- ✅ Production-ready server with MIME types and CORS
- ✅ Integrated quality selector in video controls
- ✅ Adaptive bitrate streaming
- ✅ Complete documentation

The system is now production-ready and follows YouTube's HLS architecture!
