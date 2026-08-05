import { useRef, useEffect, useState } from 'react';
import { useHlsPlayer } from '../../hooks/useHlsPlayer';

export default function VideoPlayer({ src, status, onReady }) {
  const videoRef = useRef(null);
  const [showUnmute, setShowUnmute] = useState(true);
  useHlsPlayer(videoRef, src);

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
    const unmute = () => {
      el.volume = 1;
      el.muted = false;
      setShowUnmute(false);
    };
    el.addEventListener('click', unmute, { once: true });
    return () => el.removeEventListener('click', unmute);
  }, [src]);

  if (status !== 'ready' || !src) {
    return (
      <div className="video-player">
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
            <div className="spinner__circle" style={{ width: 24, height: 24 }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <video ref={videoRef} controls preload="auto" />
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
            bottom: 16,
            left: 16,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          Включить звук
        </button>
      )}
    </div>
  );
}
