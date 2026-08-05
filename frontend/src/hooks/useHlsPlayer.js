import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function useHlsPlayer(videoRef, src) {
  const hlsRef = useRef(null);
  const recoveredRef = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    recoveredRef.current = 0;

    const startPlayback = () => {
      el.volume = 0;
      el.muted = true;
      el.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startFragPrefetch: true,
        testBandwidth: false,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
}
