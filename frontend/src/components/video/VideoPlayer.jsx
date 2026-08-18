import { useRef, useEffect, useState, useCallback } from 'react';
import { useHlsPlayer } from '../../hooks/useHlsPlayer';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({ src, status, onReady, isTheater, onToggleTheater }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [showUnmute, setShowUnmute] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsSubMenu, setSettingsSubMenu] = useState(null); // null | 'quality' | 'speed'
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { levels, currentLevel, changeLevel } = useHlsPlayer(videoRef, src);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleLoaded = () => {
      onReady?.(el);
    };

    el.addEventListener('loadeddata', handleLoaded);
    return () => el.removeEventListener('loadeddata', handleLoaded);
  }, [src, onReady]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleVolumeChange = () => {
      setShowUnmute(el.muted || el.volume === 0);
    };

    el.addEventListener('volumechange', handleVolumeChange);
    handleVolumeChange();

    return () => el.removeEventListener('volumechange', handleVolumeChange);
  }, [src]);

  // YouTube Hotkeys handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const el = videoRef.current;
      if (!el) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (el.paused) el.play();
          else el.pause();
          break;
        case 'j':
          e.preventDefault();
          el.currentTime = Math.max(0, el.currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          el.currentTime = Math.min(el.duration || 0, el.currentTime + 10);
          break;
        case 'arrowleft':
          e.preventDefault();
          el.currentTime = Math.max(0, el.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
          break;
        case 'm':
          e.preventDefault();
          el.muted = !el.muted;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          onToggleTheater?.();
          break;
        default:
          // Numeric keys 0-9 seek percentage
          if (e.key >= '0' && e.key <= '9' && el.duration) {
            e.preventDefault();
            const percent = parseInt(e.key, 10) / 10;
            el.currentTime = el.duration * percent;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTheater]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const handleSpeedChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSettingsMenu(false);
    setSettingsSubMenu(null);
  };

  const handleQualityChange = (lvlIndex) => {
    changeLevel(lvlIndex);
    setShowSettingsMenu(false);
    setSettingsSubMenu(null);
  };

  if (status !== 'ready' || !src) {
    return (
      <div className="video-player" ref={containerRef}>
        <div className="video-player__pending">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" style={{ opacity: 0.3 }}>
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
          <span>
            {status === 'pending' && 'Ожидает обработки...'}
            {status === 'processing' && 'Видео обрабатывается...'}
            {status === 'failed' && 'Ошибка обработки видео'}
            {!status && 'Видео недоступно'}
          </span>
          {status && status !== 'ready' && status !== 'failed' && (
            <div className="spinner__circle" style={{ width: 24, height: 24, marginTop: 12 }} />
          )}
        </div>
      </div>
    );
  }

  const currentQualityName = currentLevel === -1
    ? 'Авто'
    : (levels.find((l) => l.id === currentLevel)?.name || 'Авто');

  return (
    <div
      className={`video-player ${isTheater ? 'video-player--theater' : ''}`}
      ref={containerRef}
      style={{ position: 'relative' }}
      onMouseLeave={() => {
        setShowSettingsMenu(false);
        setSettingsSubMenu(null);
      }}
    >
      <video ref={videoRef} controls preload="auto" playsInline style={{ width: '100%', height: '100%' }} />

      {/* Unmute prompt button */}
      {showUnmute && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const el = videoRef.current;
            if (el) {
              el.volume = 1;
              el.muted = false;
              setShowUnmute(false);
            }
          }}
          style={{
            position: 'absolute',
            bottom: 60,
            left: 16,
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 15,
            backdropFilter: 'blur(4px)',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          Включить звук
        </button>
      )}

      {/* Settings Overlay Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowSettingsMenu((prev) => !prev);
          setSettingsSubMenu(null);
        }}
        style={{
          position: 'absolute',
          bottom: 54,
          right: 16,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
        }}
        title="Настройки качества и скорости"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>

      {/* Settings Popup Menu */}
      {showSettingsMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 96,
            right: 16,
            background: 'rgba(28, 28, 28, 0.96)',
            color: '#fff',
            borderRadius: 12,
            padding: '8px 0',
            width: 220,
            zIndex: 30,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            fontSize: 14,
            backdropFilter: 'blur(8px)',
          }}
        >
          {settingsSubMenu === null && (
            <>
              {levels.length > 0 && (
                <div
                  onClick={() => setSettingsSubMenu('quality')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    cursor: 'pointer',
                  }}
                  className="yt-menu-item"
                >
                  <span>Качество</span>
                  <span style={{ color: 'var(--yt-text-secondary)', fontSize: 13 }}>
                    {currentQualityName} ›
                  </span>
                </div>
              )}
              <div
                onClick={() => setSettingsSubMenu('speed')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  cursor: 'pointer',
                }}
                className="yt-menu-item"
              >
                <span>Скорость</span>
                <span style={{ color: 'var(--yt-text-secondary)', fontSize: 13 }}>
                  {playbackRate === 1 ? 'Обычная' : `${playbackRate}x`} ›
                </span>
              </div>
            </>
          )}

          {settingsSubMenu === 'quality' && (
            <>
              <div
                onClick={() => setSettingsSubMenu(null)}
                style={{
                  padding: '8px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ‹ Качество
              </div>
              <div
                onClick={() => handleQualityChange(-1)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: currentLevel === -1 ? 700 : 400,
                  color: currentLevel === -1 ? '#3ea6ff' : '#fff',
                }}
              >
                Авто
              </div>
              {levels.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => handleQualityChange(lvl.id)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: currentLevel === lvl.id ? 700 : 400,
                    color: currentLevel === lvl.id ? '#3ea6ff' : '#fff',
                  }}
                >
                  {lvl.name}
                </div>
              ))}
            </>
          )}

          {settingsSubMenu === 'speed' && (
            <>
              <div
                onClick={() => setSettingsSubMenu(null)}
                style={{
                  padding: '8px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ‹ Скорость воспроизведения
              </div>
              {PLAYBACK_RATES.map((rate) => (
                <div
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: playbackRate === rate ? 700 : 400,
                    color: playbackRate === rate ? '#3ea6ff' : '#fff',
                  }}
                >
                  {rate === 1 ? 'Обычная' : `${rate}x`}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
