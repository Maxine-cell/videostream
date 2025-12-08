import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import './HLSPlayer.css';

const HLSPlayer = ({ url, autoPlay = false }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const settingsMenuRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  // Load HLS stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHLS = url && (url.includes('.m3u8') || url.includes('application/vnd.apple.mpegurl'));

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsLoading(false);
    };

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1, // Auto quality
        capLevelToPlayerSize: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setError(null);

        const levels = hls.levels;
        const qualityOptions = levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : `Level ${index}`,
          height: level.height,
          bitrate: level.bitrate,
        }));

        qualityOptions.unshift({ index: -1, label: 'Auto', height: null, bitrate: null });
        setQualities(qualityOptions);
        setCurrentQuality(hls.currentLevel !== -1 ? hls.currentLevel : -1);

        if (autoPlay) {
          video.play().catch((err) => console.warn('Autoplay prevented:', err));
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        setCurrentQuality(hls.currentLevel !== -1 ? hls.currentLevel : -1);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Failed to load video stream. Please check the URL.');
              cleanup();
              break;
          }
        }
      });
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch((err) => console.warn('Autoplay prevented:', err));
      }
    } else {
      video.src = url;
      setIsLoading(false);
      setQualities([]);
      if (autoPlay) {
        video.play().catch((err) => console.warn('Autoplay prevented:', err));
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError('Failed to load video. Please check the URL.');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      cleanup();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [url, autoPlay]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        const settingsButton = event.target.closest('.hls-settings-button');
        if (!settingsButton) {
          setShowSettings(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  }, []);

  const handleProgressClick = useCallback((e) => {
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (video && duration) {
      video.currentTime = percent * duration;
    }
  }, [duration]);

  const handleVolumeChange = useCallback((e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
    }
  }, []);

  const handleQualitySelect = useCallback((qualityIndex) => {
    setCurrentQuality(qualityIndex);
    if (hlsRef.current) {
      if (qualityIndex === -1) {
        hlsRef.current.currentLevel = -1; // Auto
      } else {
        hlsRef.current.currentLevel = qualityIndex;
      }
    }
    setShowSettings(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="hls-player-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="hls-player-container" ref={containerRef}>
      <div className="hls-video-wrapper">
        {isLoading && (
          <div className="hls-loading">
            <div className="hls-spinner"></div>
            <p>Loading video...</p>
          </div>
        )}
        <video
          ref={videoRef}
          className="hls-video"
          playsInline
          onClick={togglePlay}
        />
        
        {/* Custom Controls */}
        <div className="hls-controls">
          {/* Progress Bar */}
          <div className="hls-progress-bar" onClick={handleProgressClick}>
            <div className="hls-progress-filled" style={{ width: `${progressPercent}%` }} />
            <div className="hls-progress-handle" style={{ left: `${progressPercent}%` }} />
          </div>

          {/* Control Bar */}
          <div className="hls-control-bar">
            <div className="hls-control-left">
              <button className="hls-play-button" onClick={togglePlay}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              
              <div className="hls-volume-control">
                <button 
                  className="hls-volume-button"
                  onClick={() => setShowVolumeControl(!showVolumeControl)}
                >
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                {showVolumeControl && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="hls-volume-slider"
                  />
                )}
              </div>

              <div className="hls-time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="hls-control-right">
              {qualities.length > 1 && (
                <div className="hls-settings-container" ref={settingsMenuRef}>
                  <button
                    className="hls-settings-button"
                    onClick={() => setShowSettings(!showSettings)}
                    title="Settings"
                  >
                    ⚙
                  </button>
                  {showSettings && (
                    <div className="hls-settings-menu">
                      <div className="hls-settings-title">Quality</div>
                      {qualities.map((quality) => (
                        <button
                          key={quality.index}
                          className={`hls-quality-option ${currentQuality === quality.index ? 'active' : ''}`}
                          onClick={() => handleQualitySelect(quality.index)}
                        >
                          {quality.label}
                          {currentQuality === quality.index && ' ✓'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <button className="hls-fullscreen-button" onClick={toggleFullscreen} title="Fullscreen">
                ⛶
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HLSPlayer;
