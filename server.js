// Production-ready HLS server with proper MIME types and CORS
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const HLS_DIR = path.join(__dirname, 'hls_output');

// MIME types for HLS
const mimeTypes = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.mp4': 'video/mp4',
  '.m4s': 'video/iso.segment',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.html': 'text/html',
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const urlPath = req.url === '/' ? '/master.m3u8' : req.url;
  const filePath = path.join(HLS_DIR, urlPath);
  const ext = path.extname(filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(HLS_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Set MIME type
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache control for segments
    if (ext === '.ts') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (ext === '.m3u8') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal server error');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`HLS Server running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${HLS_DIR}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  - http://localhost:${PORT}/master.m3u8`);
  console.log(`  - http://localhost:${PORT}/360p/360p.m3u8`);
  console.log(`  - http://localhost:${PORT}/480p/480p.m3u8`);
  console.log(`  - http://localhost:${PORT}/720p/720p.m3u8`);
  console.log(`  - http://localhost:${PORT}/1080p/1080p.m3u8`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});
