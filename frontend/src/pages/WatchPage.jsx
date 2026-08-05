import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getVideo, setVideoActivity, getFeed, getTimecode, setTimecode } from '../api/video';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoInfo from '../components/video/VideoInfo';
import CommentSection from '../components/video/CommentSection';
import { Spinner } from '../components/common/Spinner';

export default function WatchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const videoId = searchParams.get('v');

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timecode, setTimecodeState] = useState(null);

  const [recommended, setRecommended] = useState([]);

  const videoRef = useRef(null);
  const timecodeTimerRef = useRef(null);

  useEffect(() => {
    if (!videoId) {
      navigate('/');
      return;
    }
    setLoading(true);
    setVideo(null);
    setTimecodeState(null);
    getVideo(videoId, token)
      .then((data) => setVideo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [videoId, token, navigate]);

  useEffect(() => {
    if (!videoId || !token) return;
    getTimecode(videoId, token)
      .then((data) => {
        if (data && data.timecode_sec > 0) {
          setTimecodeState(data.timecode_sec);
        }
      })
      .catch(() => {});
  }, [videoId, token]);

  useEffect(() => {
    return () => {
      if (timecodeTimerRef.current) {
        clearInterval(timecodeTimerRef.current);
      }
    };
  }, []);

  const handleTimecodeReady = useCallback((videoEl) => {
    videoRef.current = videoEl;
    if (timecode && videoEl) {
      videoEl.currentTime = timecode;
    }
  }, [timecode]);

  useEffect(() => {
    if (!videoId || !token || !videoRef.current) return;

    if (timecodeTimerRef.current) clearInterval(timecodeTimerRef.current);

    timecodeTimerRef.current = setInterval(() => {
      const el = videoRef.current;
      if (el && el.readyState >= 2 && !el.paused) {
        setTimecode(videoId, Math.floor(el.currentTime), token).catch(() => {});
      }
    }, 15000);

    return () => {
      if (timecodeTimerRef.current) clearInterval(timecodeTimerRef.current);
    };
  }, [videoId, token]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const el = videoRef.current;
      if (el && videoId && token) {
        const sec = Math.floor(el.currentTime);
        if (sec > 0) {
          navigator.sendBeacon?.(
            `/video/${videoId}/timecode?timecode_sec=${sec}`,
            new Blob([], { type: 'application/json' })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [videoId, token]);

  useEffect(() => {
    getFeed(1, 10).then((data) => {
      setRecommended((data.items || []).filter((v) => v.id !== videoId));
    }).catch(() => {});
  }, [videoId]);

  const handleActivity = async (type) => {
    if (!token || !video) return;
    try {
      const updated = await setVideoActivity(token, video.id, type);
      setVideo(updated);
    } catch {}
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#cc0000' }}>
        Ошибка: {error}
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="watch-page">
      <div className="watch-page__main">
        <VideoPlayer src={video.master_video_url} status={video.status} onReady={handleTimecodeReady} />
        <VideoInfo video={video} onActivity={handleActivity} />
        <CommentSection videoId={video.id} />
      </div>

      <div className="watch-page__sidebar">
        {recommended.map((v) => (
          <div
            key={v.id}
            style={{ display: 'flex', gap: 8, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => navigate(`/watch?v=${v.id}`)}
          >
            <div style={{
              width: 168,
              height: 94,
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--yt-bg-secondary)',
            }}>
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #7b1fa2 0%, #7b1fa288 100%)',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  {v.title?.[0]?.toUpperCase() || 'V'}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 4,
              }}>
                {v.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)' }}>
                Автор #{v.author_id}
              </div>
              <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)' }}>
                {v.views_count} просм.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
