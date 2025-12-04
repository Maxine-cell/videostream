import React from 'react';
import DynamicResultVideo from './DynamicResultVideo';
import './App.css';

function App() {
  // Presigned URL - can be passed as prop or from environment variable
  const presignedUrl = process.env.REACT_APP_PRESIGNED_URL || 
    'https://simulation-panto.s3.eu-central-1.amazonaws.com/dev/645a061808581b0012ffaec3/dynamic-result.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAQ3VAIKWD6T7T766U%2F20251203%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20251203T090434Z&X-Amz-Expires=86400&X-Amz-Signature=3b677c0c6f6045e6106881c7d9eab3120d4633d273e99378cb77a6490f02a2b8&X-Amz-SignedHeaders=host&x-id=GetObject';

  return (
    <div className="App">
      <h1>Video Streaming with HLS Conversion</h1>
      <p className="subtitle">
        Automatically detects MP4 format and converts to HLS for optimal streaming
      </p>
      <DynamicResultVideo presignedUrl={presignedUrl} />
    </div>
  );
}

export default App;
