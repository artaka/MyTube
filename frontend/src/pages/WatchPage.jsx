import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getVideo, setVideoActivity, getFeed, getTimecode, setTimecode } from '../api/video';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoInfo from '../components/video/VideoInfo';
import CommentSection from '../components/video/CommentSection';
import VideoCard from '../components/video/VideoCard';
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
  const [isTheater, setIsTheater] = useState(false);

  const [recommended, setRecommended] = useState([]);
  const [playerEl, setPlayerEl] = useState(null);
  const initialTimecodeApplied = useRef(false);
  const timecodeTimerRef = useRef(null);

  useEffect(() => {
    if (!videoId) {
      navigate('/');
      return;
    }
    setLoading(true);
    setVideo(null);
    setTimecodeState(null);
    initialTimecodeApplied.current = false;

    getVideo(videoId, token)
      .then((data) => setVideo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [videoId, token, navigate]);

  // Load saved timecode from API
  useEffect(() => {
    if (!videoId || !token) return;
    getTimecode(videoId, token)
      .then((data) => {
        if (data && data.timecode > 0) {
          setTimecodeState(data.timecode);
        }
      })
      .catch(() => {});
  }, [videoId, token]);

  // Seek to initial timecode once player is ready
  useEffect(() => {
    if (!playerEl || timecode === null || timecode <= 0 || initialTimecodeApplied.current) {
      return;
    }

    const seekToTimecode = () => {
      if (initialTimecodeApplied.current) return;
      playerEl.currentTime = timecode;
      initialTimecodeApplied.current = true;
    };

    if (playerEl.readyState >= 1) {
      seekToTimecode();
    } else {
      playerEl.addEventListener('loadedmetadata', seekToTimecode);
      playerEl.addEventListener('canplay', seekToTimecode);
      return () => {
        playerEl.removeEventListener('loadedmetadata', seekToTimecode);
        playerEl.removeEventListener('canplay', seekToTimecode);
      };
    }
  }, [timecode, playerEl]);

  // Periodic timecode saving every 5s
  useEffect(() => {
    if (!videoId || !token || !playerEl) return;

    if (timecodeTimerRef.current) clearInterval(timecodeTimerRef.current);

    timecodeTimerRef.current = setInterval(() => {
      if (playerEl.readyState >= 1 && !playerEl.paused) {
        setTimecode(videoId, Math.floor(playerEl.currentTime), token).catch(() => {});
      }
    }, 5000);

    return () => {
      if (timecodeTimerRef.current) clearInterval(timecodeTimerRef.current);
    };
  }, [videoId, token, playerEl]);

  // Save timecode on page leave / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (playerEl && videoId && token) {
        const sec = Math.floor(playerEl.currentTime);
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
  }, [videoId, token, playerEl]);

  // Load recommended feed
  useEffect(() => {
    getFeed(1, 15).then((data) => {
      setRecommended((data.items || []).filter((v) => v.id !== videoId));
    }).catch(() => {});
  }, [videoId]);

  const handlePlayerReady = useCallback((videoEl) => {
    setPlayerEl(videoEl);
  }, []);

  const handleActivity = async (type) => {
    if (!token || !video) return;
    try {
      const updated = await setVideoActivity(token, video.id, type);
      setVideo(updated);
    } catch {}
  };

  // Click on a timecode string like "02:15"
  const handleSeekTimecode = (timeStr) => {
    if (!playerEl) return;
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    playerEl.currentTime = seconds;
    if (playerEl.paused) playerEl.play();
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#cc0000' }}>
        <h2>Ошибка: {error}</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 16,
            background: 'var(--yt-chip-bg-active)',
            color: 'var(--yt-chip-text-active)',
            padding: '10px 20px',
            borderRadius: 20,
            cursor: 'pointer',
          }}
        >
          На главную
        </button>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className={`watch-page ${isTheater ? 'watch-page--theater' : ''}`} style={{ maxWidth: 1440, margin: '0 auto', padding: '16px' }}>
      <div className="watch-page__main">
        <VideoPlayer
          src={video.master_video_url}
          status={video.status}
          onReady={handlePlayerReady}
          isTheater={isTheater}
          onToggleTheater={() => setIsTheater((prev) => !prev)}
        />
        <VideoInfo
          video={video}
          onActivity={handleActivity}
          onTimecodeClick={handleSeekTimecode}
        />
        <CommentSection
          videoId={video.id}
          onTimecodeClick={handleSeekTimecode}
        />
      </div>

      <div className="watch-page__sidebar">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingLeft: 4 }}>
          Рекомендации
        </h3>
        {recommended.map((v) => (
          <div
            key={v.id}
            style={{ display: 'flex', gap: 10, marginBottom: 12, cursor: 'pointer' }}
            onClick={() => navigate(`/watch?v=${v.id}`)}
          >
            <div style={{
              width: 168,
              height: 94,
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--yt-bg-secondary)',
              position: 'relative',
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
                color: 'var(--yt-text)',
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
