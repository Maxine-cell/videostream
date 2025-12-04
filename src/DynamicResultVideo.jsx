import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';

function DynamicResultVideo({ presignedUrl }) {
  const [hlsUrl, setHlsUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [converting, setConverting] = useState(false);
  const [videoFormat, setVideoFormat] = useState(null);

  // Backend API base URL - can be configured via environment variable
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://apiv4dev.pantohealth.com/api';
  
  // Get authentication headers for API requests
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Try multiple authentication methods
    // 1. Check for token in localStorage (common auth patterns)
    const authToken = localStorage.getItem('authToken') || 
                     localStorage.getItem('token') || 
                     localStorage.getItem('accessToken') ||
                     localStorage.getItem('jwt');
    
    // 2. Check environment variables
    const envToken = process.env.REACT_APP_AUTH_TOKEN;
    const apiKey = process.env.REACT_APP_API_KEY;
    
    // 3. Set Authorization header (token takes priority over API key)
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (envToken) {
      headers['Authorization'] = `Bearer ${envToken}`;
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-API-Key'] = apiKey;
    }
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth headers:', {
        hasToken: !!(authToken || envToken || apiKey),
        headerKeys: Object.keys(headers),
        hasLocalStorageToken: !!authToken,
        hasEnvToken: !!envToken,
        hasApiKey: !!apiKey,
        envTokenLength: envToken ? envToken.length : 0,
      });
    }
    
    return headers;
  };
  
  // Check if presigned URL is expired
  const checkPresignedUrlExpiration = (presignedUrl) => {
    try {
      const url = new URL(presignedUrl);
      const expiresParam = url.searchParams.get('X-Amz-Expires');
      const dateParam = url.searchParams.get('X-Amz-Date');
      
      if (expiresParam && dateParam) {
        // Parse date: 20251203T090434Z
        const year = dateParam.substring(0, 4);
        const month = dateParam.substring(4, 6);
        const day = dateParam.substring(6, 8);
        const hour = dateParam.substring(9, 11);
        const minute = dateParam.substring(11, 13);
        const second = dateParam.substring(13, 15);
        
        const expirationDate = new Date(
          `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
        );
        expirationDate.setSeconds(expirationDate.getSeconds() + parseInt(expiresParam));
        
        const now = new Date();
        const isExpired = now > expirationDate;
        const timeUntilExpiry = expirationDate - now;
        
        if (isExpired) {
          console.warn('⚠️ Presigned URL has EXPIRED!', {
            expiredAt: expirationDate.toISOString(),
            expiredAgo: Math.round((now - expirationDate) / 1000 / 60) + ' minutes ago'
          });
          return { isExpired: true, expirationDate, timeUntilExpiry: 0 };
        } else {
          console.log('✅ Presigned URL is valid', {
            expiresAt: expirationDate.toISOString(),
            expiresIn: Math.round(timeUntilExpiry / 1000 / 60) + ' minutes'
          });
          return { isExpired: false, expirationDate, timeUntilExpiry };
        }
      }
    } catch (err) {
      console.warn('Could not parse presigned URL expiration:', err);
    }
    return { isExpired: false, expirationDate: null, timeUntilExpiry: null };
  };

  // Extract file name and folder from presigned URL
  const extractFileInfo = (presignedUrl) => {
    try {
      const url = new URL(presignedUrl);
      const pathParts = url.pathname.split('/').filter(p => p);
      
      // Path format: /dev/{simulationId}/dynamic-result.json
      // folderName could be "dev" or the simulationId, depending on API structure
      const fileName = pathParts[pathParts.length - 1]?.split('?')[0] || null;
      const simulationId = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
      const baseFolder = pathParts.length > 2 ? pathParts[pathParts.length - 3] : null; // "dev"
      
      // Return both possible folder names for the API to try
      return { 
        fileName, 
        folderName: simulationId, // Try simulationId first
        baseFolder: baseFolder, // "dev" if exists
        simulationId: simulationId 
      };
    } catch (err) {
      console.error('Error extracting file info:', err);
      return { fileName: null, folderName: 'videos', baseFolder: null, simulationId: null };
    }
  };

  useEffect(() => {
    const processVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!presignedUrl) {
          throw new Error('No presigned URL provided');
        }

        // Check if presigned URL is expired
        const expirationCheck = checkPresignedUrlExpiration(presignedUrl);
        if (expirationCheck.isExpired) {
          throw new Error(
            `Presigned URL has expired. Please get a fresh presigned URL. The URL expired at ${expirationCheck.expirationDate?.toLocaleString()}.`
          );
        }

        // Check actual Content-Type header, not URL extension
        const fileType = await checkFileType(presignedUrl);
        console.log('Detected file type:', fileType);
        setVideoFormat(fileType);

        if (fileType === 'mp4') {
          setConverting(true);
          const hlsUrlResult = await convertToHLS(presignedUrl);
          setHlsUrl(hlsUrlResult);
          setConverting(false);
        } else if (fileType === 'hls' || fileType === 'm3u8') {
          setHlsUrl(presignedUrl);
        } else {
          // JSON or unknown - send to backend
          setConverting(true);
          const hlsUrlResult = await processJsonUrl(presignedUrl);
          setHlsUrl(hlsUrlResult);
          setConverting(false);
        }
        
      } catch (err) {
        console.error('Error processing video:', err);
        setError(err.message || 'Failed to process video');
      } finally {
        setLoading(false);
        setConverting(false);
      }
    };

    if (presignedUrl) {
      processVideo();
    }
  }, [presignedUrl]);

  // Check actual file type from Content-Type header
  const checkFileType = async (url) => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
      });
      
      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);
      
      if (contentType.includes('video/mp4') || contentType.includes('mp4')) {
        return 'mp4';
      } else if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('m3u8')) {
        return 'hls';
      } else if (contentType.includes('application/json') || contentType.includes('json')) {
        return 'json';
      }
      
      // Fallback to URL extension if Content-Type unclear
      const urlPath = new URL(url).pathname.toLowerCase();
      const extension = urlPath.split('.').pop();
      return extension === 'm3u8' ? 'hls' : extension;
    } catch (err) {
      // Silently fallback to URL extension (CORS errors are expected with presigned URLs)
      const urlPath = new URL(url).pathname.toLowerCase();
      const extension = urlPath.split('.').pop();
      console.log('Using URL extension for file type:', extension);
      return extension === 'm3u8' ? 'hls' : extension;
    }
  };

  // Handle stream API response
  const handleStreamResponse = (response, originalUrl) => {
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', response.data);
    console.log('API Response Headers:', response.headers);

    // The API should return HLS URL or stream URL
    if (response.data.hlsUrl || response.data.streamUrl || response.data.url) {
      const hlsUrl = response.data.hlsUrl || response.data.streamUrl || response.data.url;
      console.log('HLS/Stream URL received:', hlsUrl);
      return hlsUrl;
    } else if (response.data.jobId) {
      // Async conversion
      return pollConversionStatus(response.data.jobId, originalUrl);
    } else if (typeof response.data === 'string' && response.data.startsWith('http')) {
      // Direct URL string response
      console.log('Direct URL response:', response.data);
      return response.data;
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error(`Invalid response from backend: ${JSON.stringify(response.data)}`);
    }
  };

  // Process JSON URL - backend will find MP4 and convert to HLS
  const processJsonUrl = async (jsonUrl) => {
    try {
      console.log('Processing URL through backend stream API...');
      
      // Extract file info from URL
      const { fileName, folderName, baseFolder, simulationId } = extractFileInfo(jsonUrl);
      
      if (!fileName) {
        throw new Error('Could not extract file name from URL');
      }
      
      // Try multiple video file name patterns
      const videoFileNamePatterns = [];
      
      if (fileName.includes('dynamic-result.json')) {
        // Try exact replacements first
        videoFileNamePatterns.push(
          fileName.replace('dynamic-result.json', 'dynamic-video.mp4'),
          fileName.replace('dynamic-result.json', 'video.mp4'),
          fileName.replace('dynamic-result.json', 'output.mp4'),
          fileName.replace('dynamic-result.json', 'result.mp4'),
          // Try with simulation ID
          `dynamic-video-${simulationId}.mp4`,
          `video-${simulationId}.mp4`,
          // Try just the base name
          'dynamic-video.mp4',
          'video.mp4',
          'output.mp4'
        );
      } else if (fileName.endsWith('.json')) {
        videoFileNamePatterns.push(
          fileName.replace('.json', '.mp4'),
          fileName.replace('.json', '-video.mp4'),
          fileName.replace('.json', '-output.mp4'),
          `video-${simulationId}.mp4`
        );
      } else if (simulationId) {
        videoFileNamePatterns.push(
          `video-${simulationId}.mp4`,
          `dynamic-video-${simulationId}.mp4`,
          `${simulationId}.mp4`,
          'video.mp4',
          'dynamic-video.mp4'
        );
      }
      
      // Try multiple folder name patterns - prioritize the exact path structure from JSON URL
      const folderNamePatterns = [
        `${baseFolder}/${folderName}`, // "dev/645a061808581b0012ffaec3" - matches JSON path exactly
        folderName, // "645a061808581b0012ffaec3" - simulationId only
        baseFolder, // "dev" - base folder only
        'videos',
        `${baseFolder}/${folderName}/videos` // "dev/645a061808581b0012ffaec3/videos"
      ].filter(Boolean);
      
      console.log('Trying file patterns:', videoFileNamePatterns);
      console.log('Trying folder patterns:', folderNamePatterns);
      
      // Try each combination until one works
      let lastError = null;
      for (const videoFileName of videoFileNamePatterns) {
        for (const tryFolderName of folderNamePatterns) {
          try {
            console.log(`Trying: fileName=${videoFileName}, folderName=${tryFolderName}`);
            
            const response = await axios.get(
              `${API_BASE_URL}/v4/aws/stream`,
              {
                params: {
                  fileName: videoFileName,
                  folderName: tryFolderName,
                },
                headers: getAuthHeaders(),
                timeout: 30000,
              }
            );
            
            // If we get here, the request succeeded
            console.log('Success! Found file:', { fileName: videoFileName, folderName: tryFolderName });
            return handleStreamResponse(response, jsonUrl);
            
          } catch (err) {
            lastError = err;
            
            // Log detailed error information
            if (err.response) {
              console.log(`❌ Failed: ${err.response.status} - ${err.response.data?.message || err.message}`, {
                fileName: videoFileName,
                folderName: tryFolderName,
                responseData: err.response.data
              });
            } else {
              console.log(`❌ Failed: ${err.message}`, { fileName: videoFileName, folderName: tryFolderName });
            }
            
            // If it's not a "Key Not Found" or 404 error, stop trying
            if (err.response?.status !== 404 && 
                err.response?.data?.message !== 'Key Not Found' &&
                err.response?.status !== 400) {
              throw err;
            }
            // Continue to next pattern
          }
        }
      }
      
      // Last attempt: Try with just simulationId as folderName (some APIs work this way)
      if (simulationId) {
        console.log('Last attempt: Trying with simulationId only as folderName...');
        const simpleFileNames = ['dynamic-video.mp4', 'video.mp4', 'output.mp4'];
        for (const simpleFile of simpleFileNames) {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/v4/aws/stream`,
              {
                params: {
                  fileName: simpleFile,
                  folderName: simulationId,
                },
                headers: getAuthHeaders(),
                timeout: 30000,
              }
            );
            console.log('✅ Success! Found file:', { fileName: simpleFile, folderName: simulationId });
            return handleStreamResponse(response, jsonUrl);
          } catch (err) {
            // Continue
          }
        }
      }
      
      // If all patterns failed, provide detailed error message
      const triedCombinations = videoFileNamePatterns.length * folderNamePatterns.length;
      const errorDetails = {
        triedFileNames: videoFileNamePatterns.slice(0, 5),
        triedFolderNames: folderNamePatterns,
        originalFileName: fileName,
        simulationId: simulationId,
        totalAttempts: triedCombinations
      };
      console.error('❌ All file name patterns failed:', errorDetails);
      
      throw new Error(
        `Video file not found. Tried ${triedCombinations}+ combinations.\n\n` +
        `Checked file names: ${videoFileNamePatterns.slice(0, 3).join(', ')}...\n` +
        `Checked folders: ${folderNamePatterns.slice(0, 3).join(', ')}...\n\n` +
        `⚠️ Please ask your backend team:\n` +
        `1. What is the exact video file name for simulation ${simulationId}?\n` +
        `2. What should the 'folderName' parameter be?\n` +
        `3. Check API docs: https://apiv4dev.pantohealth.com/api/docs`
      );
    } catch (err) {
      console.error('Error processing URL:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        throw new Error(`Cannot connect to backend API at ${API_BASE_URL}. Please ensure the backend server is running.`);
      }
      
      // Handle 401 Unauthorized with helpful message
      if (err.response?.status === 401) {
        const authHeaders = getAuthHeaders();
        const hasAuth = !!(authHeaders['Authorization'] || authHeaders['X-API-Key']);
        console.error('Authentication failed. Headers sent:', Object.keys(authHeaders));
        throw new Error(
          `Unauthorized: Authentication required. ${hasAuth ? 'Your credentials may be invalid. Please check your API token/key.' : 'Please add REACT_APP_AUTH_TOKEN or REACT_APP_API_KEY to your .env file, or ensure you are logged in.'}`
        );
      }
      
      throw new Error(`Failed to process video URL: ${err.response?.data?.message || err.message}`);
    }
  };

  // Process unknown format - use stream API
  const processUnknownFormat = async (url) => {
    try {
      const { fileName, folderName } = extractFileInfo(url);
      
      if (!fileName) {
        throw new Error('Could not extract file name from URL');
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/v4/aws/stream`,
        {
          params: {
            fileName: fileName,
            folderName: folderName || 'videos',
          },
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.hlsUrl || response.data.streamUrl || response.data.url) {
        return response.data.hlsUrl || response.data.streamUrl || response.data.url;
      } else if (typeof response.data === 'string' && response.data.startsWith('http')) {
        return response.data;
      } else {
        throw new Error('Invalid response from backend');
      }
    } catch (err) {
      console.error('Error processing unknown format:', err);
      throw new Error(`Failed to process video: ${err.response?.data?.message || err.message}`);
    }
  };


  // Convert MP4 to HLS using backend stream API
  const convertToHLS = async (mp4Url) => {
    try {
      console.log('Requesting HLS stream for MP4...');
      
      const { fileName, folderName } = extractFileInfo(mp4Url);
      
      if (!fileName) {
        throw new Error('Could not extract file name from URL');
      }
      
      // Call stream API - backend will handle MP4 to HLS conversion
      const response = await axios.get(
        `${API_BASE_URL}/v4/aws/stream`,
        {
          params: {
            fileName: fileName,
            folderName: folderName || 'videos',
          },
          headers: getAuthHeaders(),
          timeout: 30000,
        }
      );

      if (response.data.hlsUrl || response.data.streamUrl || response.data.url) {
        const hlsUrl = response.data.hlsUrl || response.data.streamUrl || response.data.url;
        console.log('HLS stream URL received:', hlsUrl);
        return hlsUrl;
      } else if (response.data.jobId) {
        // Async conversion
        console.log('HLS conversion job started:', response.data.jobId);
        return await pollConversionStatus(response.data.jobId, mp4Url);
      } else if (typeof response.data === 'string' && response.data.startsWith('http')) {
        return response.data;
      } else {
        throw new Error('Invalid response from backend');
      }
    } catch (err) {
      console.error('Error getting HLS stream:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        throw new Error(`Cannot connect to backend API at ${API_BASE_URL}. Please ensure the backend server is running.`);
      }
      
      throw new Error(`Failed to get HLS stream: ${err.response?.data?.message || err.message}`);
    }
  };

  // Poll for conversion status (if async)
  const pollConversionStatus = async (jobId, originalUrl) => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${API_BASE_URL}/convert-status/${jobId}`, {
          headers: getAuthHeaders(),
          timeout: 10000,
        });

        if (response.data.status === 'completed') {
          return response.data.hlsUrl;
        } else if (response.data.status === 'failed') {
          throw new Error(response.data.error || 'Conversion failed');
        } else if (response.data.status === 'processing') {
          // Continue polling
          console.log(`Conversion in progress... (${response.data.progress || 0}%)`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          attempts++;
        } else {
          // Unknown status
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        }
      } catch (err) {
        if (err.response?.status === 404) {
          // Job not found, might need to retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        } else {
          throw err;
        }
      }
    }

    throw new Error('Conversion timeout - job took too long');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Checking video format...</div>
      </div>
    );
  }

  if (converting) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Converting MP4 to HLS format...</div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          This may take a few moments
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
        <p><strong>Error:</strong> {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '10px', 
            padding: '10px 20px', 
            cursor: 'pointer',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Retry
        </button>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <p>Debug Info:</p>
            <p>Format: {videoFormat}</p>
            <p>URL: {presignedUrl}</p>
          </div>
        )}
      </div>
    );
  }

  if (!hlsUrl) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No video URL available</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        position: 'relative', 
        paddingTop: '56.25%', // 16:9 aspect ratio
        backgroundColor: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <ReactPlayer
          url={hlsUrl}
          width="100%"
          height="100%"
          controls
          playing={false}
          style={{ position: 'absolute', top: 0, left: 0 }}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload'
              },
              forceHLS: true, // Force HLS playback
              hlsOptions: {
                // HLS.js options
                enableWorker: true,
                lowLatencyMode: false,
              }
            }
          }}
          onError={(err) => {
            console.error('Video playback error:', err);
            setError('Video failed to play. The HLS stream may not be ready yet.');
          }}
          onReady={() => console.log('HLS video is ready')}
          onStart={() => console.log('HLS video started')}
        />
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', wordBreak: 'break-all' }}>
          <p><strong>Format:</strong> {videoFormat}</p>
          <p><strong>HLS URL:</strong> {hlsUrl}</p>
          <p><strong>Original URL:</strong> {presignedUrl}</p>
        </div>
      )}
    </div>
  );
}

export default DynamicResultVideo;

