import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';
import { useChannel } from '../../context/ChannelContext';
import { deleteVideo } from '../../api/video';
import { formatViews, timeAgo, formatCount } from '../common/format';
import Avatar from '../common/Avatar';
import { ThumbUpIcon, ThumbDownIcon, ShareIcon } from '../common/Icons';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function VideoInfo({ video, onActivity, onTimecodeClick }) {
  const { user, token } = useAuth();
  const { openAuth } = useAuthModal();
  const { getChannelByAuthorId, isSubscribed, toggleSub } = useChannel();
  const navigate = useNavigate();

  const [authorChannel, setAuthorChannel] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!video?.author_id) return;
    let isMounted = true;

    async function loadAuthorChannel() {
      const ch = await getChannelByAuthorId(video.author_id);
      if (isMounted && ch) {
        setAuthorChannel(ch);
        if (ch.avatar_small_url || ch.avatar_url) {
          setAvatarUrl(ch.avatar_small_url || ch.avatar_url);
        }
      }
    }
    loadAuthorChannel();

    return () => {
      isMounted = false;
    };
  }, [video?.author_id, getChannelByAuthorId]);


  if (!video) return null;

  const isOwner = user && user.id === video.author_id;
  const subscribed = authorChannel ? isSubscribed(authorChannel.id) : false;

  const handleDescToggle = () => {
    setDescExpanded((v) => !v);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {}
    onActivity?.('share');
  };

  const handleSubscribe = async (e) => {
    e.stopPropagation();
    if (!token) {
      openAuth();
      return;
    }
    if (!authorChannel) return;
    setSubscribing(true);
    try {
      const nowSubbed = await toggleSub(authorChannel.id);
      setAuthorChannel((prev) => ({
        ...prev,
        subscribers_counter: Math.max(0, (prev?.subscribers_counter || 0) + (nowSubbed ? 1 : -1)),
      }));
    } catch (err) {
      alert(`Ошибка подписки: ${err.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить это видео?')) return;
    try {
      await deleteVideo(token, video.id);
      navigate('/');
    } catch (err) {
      alert(`Ошибка при удалении видео: ${err.message}`);
    }
  };

  // Helper to render description with clickable timecodes
  const renderDescription = (text) => {
    if (!text) return null;
    const timecodeRegex = /(\b(?:[0-5]?\d:)?[0-5]?\d:[0-5]\d\b)/g;
    const parts = text.split(timecodeRegex);
    return parts.map((part, index) => {
      if (timecodeRegex.test(part)) {
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onTimecodeClick?.(part);
            }}
            style={{ color: '#3ea6ff', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="video-info">
      <h1 className="video-info__title">{video.title}</h1>

      {/* Stats & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="video-info__stats">
          <span>{formatViews(video.views_count)}</span>
          <span>{timeAgo(video.created_at)}</span>
        </div>

        <div className="video-info__actions" style={{ margin: 0 }}>
          <button
            className={`action-btn ${video.viewer_activity === 'like' ? 'action-btn--active' : ''}`}
            onClick={() => onActivity?.('like')}
            title="Нравится"
          >
            <ThumbUpIcon filled={video.viewer_activity === 'like'} />
            {formatCount(video.likes_count)}
          </button>
          <button
            className={`action-btn ${video.viewer_activity === 'dislike' ? 'action-btn--active' : ''}`}
            onClick={() => onActivity?.('dislike')}
            title="Не нравится"
          >
            <ThumbDownIcon filled={video.viewer_activity === 'dislike'} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="action-btn" onClick={handleShare}>
              <ShareIcon />
              Поделиться
            </button>
            {shareTooltip && <div className="share-tooltip">Ссылка скопирована</div>}
          </div>
        </div>
      </div>

      {/* Channel info banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        borderBottom: '1px solid var(--yt-border)',
        borderTop: '1px solid var(--yt-border)',
        margin: '16px 0',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          onClick={() => navigate(`/channel/${authorChannel?.handle || video.author_id}`)}
        >
          <Avatar
            src={avatarUrl}
            name={authorChannel?.name}
            userId={video.author_id}
            size={44}
          />

          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--yt-text)' }}>
              {authorChannel?.name || `Автор #${video.author_id}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)' }}>
              {authorChannel?.handle || `@user_${video.author_id}`} • {formatCount(authorChannel?.subscribers_counter || 0)} подписчиков
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isOwner && (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              style={{
                background: subscribed ? 'rgba(255,255,255,0.1)' : 'var(--yt-chip-bg-active)',
                color: subscribed ? 'var(--yt-text)' : 'var(--yt-chip-text-active)',
                padding: '9px 18px',
                borderRadius: 20,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                border: subscribed ? '1px solid var(--yt-border)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {subscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}

          {isOwner && (
            <button
              onClick={handleDelete}
              style={{
                background: '#cc0000',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Удалить видео
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {video.description && (
        <div className="video-info__description" onClick={handleDescToggle}>
          <div style={descExpanded ? { whiteSpace: 'pre-wrap', lineHeight: 1.5 } : {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}>
            {renderDescription(video.description)}
          </div>
          {!descExpanded && <div className="video-info__description-toggle">Ещё</div>}
        </div>
      )}
    </div>
  );
}
