#!/bin/bash

echo "Converting MP4 to HLS format..."
echo ""

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: FFmpeg is not installed"
    echo "Please install FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  macOS: brew install ffmpeg"
    exit 1
fi

# Check if input file is provided
if [ -z "$1" ]; then
    echo "Usage: ./convert-to-hls.sh input.mp4"
    echo ""
    echo "Example: ./convert-to-hls.sh video.mp4"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_DIR="hls_output"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "ERROR: Input file not found: $INPUT_FILE"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Input file: $INPUT_FILE"
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Starting conversion (this may take a few minutes)..."
echo ""

# Convert to HLS with multiple quality levels
ffmpeg -i "$INPUT_FILE" \
  -c:v libx264 -c:a aac \
  -b:v:0 400k -b:v:1 800k -b:v:2 1500k -b:v:3 3000k \
  -s:v:0 640x360 -s:v:1 854x480 -s:v:2 1280x720 -s:v:3 1920x1080 \
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" \
  -master_pl_name master.m3u8 \
  -f hls -hls_time 10 -hls_playlist_type vod \
  -hls_segment_filename "$OUTPUT_DIR/v%v/segment_%03d.ts" \
  "$OUTPUT_DIR/v%v/playlist.m3u8"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Conversion completed successfully!"
    echo "========================================"
    echo ""
    echo "Output files are in: $OUTPUT_DIR"
    echo "Master playlist: $OUTPUT_DIR/master.m3u8"
    echo ""
    echo "Next steps:"
    echo "1. cd $OUTPUT_DIR"
    echo "2. Start a local server: python -m http.server 8000"
    echo "3. Use URL: http://localhost:8000/master.m3u8"
    echo ""
else
    echo ""
    echo "ERROR: Conversion failed!"
    echo ""
    exit 1
fi


