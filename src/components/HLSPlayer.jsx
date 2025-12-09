import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import './HLSPlayer.css';

const HLSPlayer = ({ url, autoPlay = false }) => {
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const isSettingUpRef = useRef(false);
  const userSelectedQualityRef = useRef(null);
  const networkRetryCount = useRef(0);

  const MAX_NETWORK_RETRIES = 3;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [userSelectedQuality, setUserSelectedQuality] = useState(null);
  const qualityMenuRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setQualities([]);
    setCurrentQuality(-1);
    setUserSelectedQuality(null);
    userSelectedQualityRef.current = null;
    networkRetryCount.current = 0;
    isSettingUpRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [url]);

  // Setup HLS
  const setupHLS = useCallback(() => {
    if (isSettingUpRef.current) return;

    const player = playerRef.current?.getInternalPlayer();
    if (!player) return;
    if (hlsRef.current) return;

    isSettingUpRef.current = true;

    let hls = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: true,
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: false,
        maxStarvationDelay: 4,
        maxLoadingDelay: 4,
      });
      hls.loadSource(url);
      hls.attachMedia(player);
      hls.currentLevel = -1;
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = url;
      setLoading(false);
      isSettingUpRef.current = false;
      return;
    } else {
      setError('HLS not supported in this browser');
      setLoading(false);
      isSettingUpRef.current = false;
      return;
    }

    hlsRef.current = hls;

    const onManifestParsed = () => {
      setLoading(false);
      networkRetryCount.current = 0;

      const levels = hls.levels.map((level, idx) => ({
        index: idx,
        label: level.height 
          ? `${level.height}p (${Math.round((level.bitrate || 0)/1000)} kbps)` 
          : `Level ${idx + 1}`,
        bitrate: Math.round((level.bitrate || 0) / 1000),
      }));
      setQualities([{ index: -1, label: 'Auto' }, ...levels]);

      if (userSelectedQualityRef.current === null) {
        hls.currentLevel = -1;
        setCurrentQuality(-1);
      } else {
        setCurrentQuality(hls.currentLevel);
      }
    };

    const onLevelSwitched = (_, data) => {
      if (userSelectedQualityRef.current === null) {
        setCurrentQuality(data.level);
      } else {
        setCurrentQuality(hls.currentLevel);
      }
    };

    const onError = (_, data) => {
      console.error('HLS error', data);

      if (!hlsRef.current) return;

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (networkRetryCount.current < MAX_NETWORK_RETRIES) {
              networkRetryCount.current += 1;
              console.log(`Retrying network... attempt ${networkRetryCount.current}`);
              hlsRef.current.startLoad();
            } else if (hlsRef.current.levels.length > 0) {
              console.log('Switching to lowest quality due to network issues');
              hlsRef.current.currentLevel = 0;
              setCurrentQuality(0);
              networkRetryCount.current = 0;
            }
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Recovering media error...');
            hlsRef.current.recoverMediaError();
            break;

          default:
            setError('Video playback error');
            break;
        }
      }
    };

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
    hls.on(Hls.Events.ERROR, onError);

    if (hls.levels && hls.levels.length > 0) {
      if (userSelectedQualityRef.current === null) hls.currentLevel = -1;
      onManifestParsed();
    }

    isSettingUpRef.current = false;
  }, [url]);

  const handleReady = useCallback(() => {
    let retries = 0;
    const maxRetries = 10;

    const trySetup = () => {
      const player = playerRef.current?.getInternalPlayer();
      if (!player) {
        if (retries < maxRetries) {
          retries++;
          setTimeout(trySetup, 100);
        }
        return;
      }

      const hlsInstance = playerRef.current?.player?.hls || player.hls;
      if (hlsInstance || Hls.isSupported()) {
        setupHLS();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(trySetup, 100);
      }
    };

    setTimeout(trySetup, 100);
  }, [setupHLS]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const handleQualitySelect = useCallback((index) => {
    if (!hlsRef.current) return;

    if (index === -1) {
      hlsRef.current.currentLevel = -1;
      setUserSelectedQuality(null);
      userSelectedQualityRef.current = null;
      setCurrentQuality(-1);
    } else {
      hlsRef.current.currentLevel = index;
      setUserSelectedQuality(index);
      userSelectedQualityRef.current = index;
      setCurrentQuality(index);
    }

    setShowQualityMenu(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target)) {
        setShowQualityMenu(false);
      }
    };

    if (showQualityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showQualityMenu]);

  const getCurrentQualityLabel = () => {
    const current = qualities.find(q => q.index === currentQuality);
    return current ? current.label : 'Auto';
  };

  if (error) {
    return (
      <div className="hls-player-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="hls-player-container">
      {loading && <div className="hls-loading">Loading video...</div>}
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={autoPlay}
        controls
        width="100%"
        height="100%"
        onReady={handleReady}
        config={{ file: { attributes: { playsInline: true } } }}
      />
      {qualities.length > 1 && (
        <div className="hls-quality-selector" style={{ marginBottom: '60px' }} ref={qualityMenuRef}>
          <button
            className="hls-quality-button"
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            title="Quality"
          >
            <span className="hls-quality-icon">⚙</span>
            <span className="hls-quality-label">{getCurrentQualityLabel()}</span>
          </button>
          {showQualityMenu && (
            <div className="hls-quality-menu">
              {qualities.map((q) => (
                <button
                  key={q.index}
                  onClick={() => handleQualitySelect(q.index)}
                  className={`hls-quality-option ${currentQuality === q.index ? 'active' : ''}`}
                >
                  <span>{q.label}</span>
                  {currentQuality === q.index && <span className="hls-quality-check">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HLSPlayer;
