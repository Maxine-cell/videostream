import React from 'react';
import HLSPlayer from './components/HLSPlayer';
import './App.css';

function App() {
  // Video URL - Update this with your HLS stream URL
  // For testing with quality selector, use an HLS stream (.m3u8):
  // const videoUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  
  // For your own converted video (after running conversion script):
  const videoUrl = 'http://localhost:8000/master.m3u8';
  
  // For regular MP4 (no quality selector):
  // const videoUrl = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="App" style={{ textAlign: 'center', padding: '40px' }}>
      <h1>Video Streaming Demo</h1>

      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <HLSPlayer url={videoUrl} autoPlay={false} />
      </div>
    </div>
  );
}

export default App;
