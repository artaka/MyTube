import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFeed, setVideoActivity } from '../api/video';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { useChannel } from '../context/ChannelContext';
import { useHlsPlayer } from '../hooks/useHlsPlayer';
import CommentSection from '../components/video/CommentSection';
import { ThumbUpIcon, ThumbDownIcon, ShareIcon } from '../components/common/Icons';
import { Spinner } from '../components/common/Spinner';
import { formatCount } from '../components/common/format';
import Avatar from '../components/common/Avatar';


function ShortPlayerItem({ src, status, isActive }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCenterIcon, setShowCenterIcon] = useState(null); // 'play' | 'pause' | null

  useHlsPlayer(videoRef, src);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.currentTime = 0;
      el.play().catch(() => {
        el.muted = true;
        setIsMuted(true);
        el.play().catch(() => {});
      });
    } else {
      el.pause();
    }
  }, [isActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (el.duration) {
        setProgress((el.currentTime / el.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolume = () => setIsMuted(el.muted || el.volume === 0);

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('volumechange', handleVolume);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('volumechange', handleVolume);
    };
  }, []);

  const handleVideoClick = () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.play();
      setShowCenterIcon('play');
    } else {
      el.pause();
      setShowCenterIcon('pause');
    }
    setTimeout(() => setShowCenterIcon(null), 500);
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  if (status !== 'ready' || !src) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff' }}>
        <Spinner />
        <span style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
          {status === 'processing' ? 'Видео обрабатывается...' : 'Загрузка...'}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={handleVideoClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        ref={videoRef}
        loop
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Center brief Play/Pause animation */}
      {showCenterIcon && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '50%',
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          zIndex: 10,
          pointerEvents: 'none',
          animation: 'fadeInOut 0.5s ease',
        }}>
          {showCenterIcon === 'play' ? (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </div>
      )}

      {/* Top right mute button */}
      <button
        onClick={handleToggleMute}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          backdropFilter: 'blur(4px)',
        }}
        title={isMuted ? 'Включить звук' : 'Выключить звук'}
      >
        {isMuted ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </button>

      {/* Bottom sleek progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'rgba(255,255,255,0.25)',
        zIndex: 20,
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--yt-red, #ff0000)',
          transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
}

export default function ShortsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { openAuth } = useAuthModal();
  const { getChannelByAuthorId, isSubscribed, toggleSub } = useChannel();

  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [channelsMap, setChannelsMap] = useState({});
  const [shareTooltip, setShareTooltip] = useState(false);

  useEffect(() => {
    setLoading(true);
    getFeed(1, 30)
      .then((data) => {
        const items = data.items || [];
        setVideos(items);

        // Fetch channel info for all items
        items.forEach(async (v) => {
          try {
            const ch = await getChannelByAuthorId(v.author_id);
            if (ch) {
              setChannelsMap((prev) => ({
                ...prev,
                [v.author_id]: {
                  ...ch,
                  avatar: ch.avatar_small_url || ch.avatar_url,
                },
              }));
            }
          } catch {}
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [getChannelByAuthorId]);


  const currentVideo = videos[currentIndex];
  const currentChannel = currentVideo ? channelsMap[currentVideo.author_id] : null;
  const subscribed = currentChannel ? isSubscribed(currentChannel.id) : false;

  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowComments(false);
    }
  }, [currentIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowComments(false);
    }
  }, [currentIndex]);

  // Keyboard navigation for shorts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const handleActivity = async (type) => {
    if (!token) {
      openAuth();
      return;
    }
    if (!currentVideo) return;
    try {
      const updated = await setVideoActivity(token, currentVideo.id, type);
      setVideos((prev) => prev.map((v) => (v.id === currentVideo.id ? updated : v)));
    } catch {}
  };

  const handleShare = async () => {
    if (!currentVideo) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/watch?v=${currentVideo.id}`);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {}
    handleActivity('share');
  };

  const handleSubscribe = async () => {
    if (!token) {
      openAuth();
      return;
    }
    if (!currentChannel) return;
    try {
      await toggleSub(currentChannel.id);
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  if (loading) return <Spinner />;

  if (!currentVideo) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--yt-text-secondary)' }}>
        <h2>Нет доступных Shorts</h2>
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

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      height: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
      gap: 20,
      position: 'relative',
    }}>
      {/* Vertical Short Player Container (9:16) */}
      <div style={{
        height: '100%',
        maxHeight: 760,
        aspectRatio: '9/16',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <ShortPlayerItem
          key={currentVideo.id}
          src={currentVideo.master_video_url}
          status={currentVideo.status}
          isActive={true}
        />

        {/* Overlay channel info and title */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 16px 16px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          color: '#fff',
          pointerEvents: 'none',
          zIndex: 15,
        }}>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, pointerEvents: 'auto' }}>
            <Avatar
              src={currentChannel?.avatar}
              name={currentChannel?.name}
              userId={currentVideo.author_id}
              size={36}
              onClick={() => navigate(`/channel/${currentChannel?.handle || currentVideo.author_id}`)}
            />
            <span
              style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              onClick={() => navigate(`/channel/${currentChannel?.handle || currentVideo.author_id}`)}
            >
              {currentChannel?.name || `@user_${currentVideo.author_id}`}
            </span>

            {user?.id !== currentVideo.author_id && (
              <button
                onClick={handleSubscribe}
                style={{
                  background: subscribed ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: subscribed ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: 16,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {subscribed ? 'Подписан' : 'Подписаться'}
              </button>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, pointerEvents: 'auto' }}>
            {currentVideo.title}
          </div>
        </div>
      </div>

      {/* Floating Side Action Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {/* Like */}
        <button
          onClick={() => handleActivity('like')}
          style={{
            background: currentVideo.viewer_activity === 'like' ? '#065fd4' : 'var(--yt-bg-secondary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexDirection: 'column',
          }}
          title="Нравится"
        >
          <ThumbUpIcon filled={currentVideo.viewer_activity === 'like'} size={22} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--yt-text)', marginTop: -10 }}>
          {formatCount(currentVideo.likes_count || 0)}
        </span>

        {/* Dislike */}
        <button
          onClick={() => handleActivity('dislike')}
          style={{
            background: currentVideo.viewer_activity === 'dislike' ? '#065fd4' : 'var(--yt-bg-secondary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Не нравится"
        >
          <ThumbDownIcon filled={currentVideo.viewer_activity === 'dislike'} size={22} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--yt-text)', marginTop: -10 }}>
          Дизлайк
        </span>

        {/* Comments */}
        <button
          onClick={() => setShowComments((prev) => !prev)}
          style={{
            background: showComments ? '#065fd4' : 'var(--yt-bg-secondary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Комментарии"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
        <span style={{ fontSize: 12, color: 'var(--yt-text)', marginTop: -10 }}>
          {formatCount(currentVideo.comments_count || 0)}
        </span>

        {/* Share */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleShare}
            style={{
              background: 'var(--yt-bg-secondary)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Поделиться"
          >
            <ShareIcon size={22} />
          </button>
          {shareTooltip && (
            <div className="share-tooltip" style={{ bottom: 56, right: 0 }}>
              Ссылка скопирована
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--yt-text)', marginTop: -10 }}>
          Поделиться
        </span>

        {/* Prev / Next navigation buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            style={{
              background: 'var(--yt-bg-secondary)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.4 : 1,
            }}
            title="Предыдущее видео (Стрелка вверх)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex === videos.length - 1}
            style={{
              background: 'var(--yt-bg-secondary)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentIndex === videos.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === videos.length - 1 ? 0.4 : 1,
            }}
            title="Следующее видео (Стрелка вниз)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Side Slide-out Comments Drawer */}
      {showComments && (
        <div style={{
          width: 380,
          height: '100%',
          maxHeight: 760,
          background: 'var(--yt-bg-secondary)',
          borderRadius: 16,
          padding: 16,
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Комментарии к Short</h3>
            <button
              onClick={() => setShowComments(false)}
              style={{ background: 'none', border: 'none', color: 'var(--yt-text)', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>
          <CommentSection videoId={currentVideo.id} />
        </div>
      )}
    </div>
  );
}
