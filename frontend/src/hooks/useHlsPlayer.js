import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

export function useHlsPlayer(videoRef, src) {
  const hlsRef = useRef(null);
  const recoveredRef = useRef(0);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    recoveredRef.current = 0;
    setLevels([]);
    setCurrentLevel(-1);

    const startPlayback = () => {
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startFragPrefetch: true,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data?.levels?.length > 0) {
          const parsed = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
            name: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)} kbps`,
          }));
          setLevels(parsed);
        }
        startPlayback();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.autoLevelEnabled) {
          // Keep -1 as selected
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (recoveredRef.current >= 5) return;

        recoveredRef.current++;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          hlsRef.current = null;
        }
      });

      hls.loadSource(src);
      hls.attachMedia(el);
      hlsRef.current = hls;
    } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = src;
      el.addEventListener('loadedmetadata', startPlayback);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, videoRef]);

  const changeLevel = useCallback((levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  }, []);

  return {
    levels,
    currentLevel,
    changeLevel,
    hls: hlsRef.current,
  };
}
