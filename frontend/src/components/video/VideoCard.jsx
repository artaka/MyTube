import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDuration, formatViews, timeAgo } from '../common/format';
import Avatar from '../common/Avatar';
import { useChannel } from '../../context/ChannelContext';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const { getChannelByAuthorId } = useChannel();
  const [authorChannel, setAuthorChannel] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!video?.author_id) return;
    let mounted = true;

    async function fetchAuthor() {
      const ch = await getChannelByAuthorId(video.author_id);
      if (mounted && ch) {
        setAuthorChannel(ch);
        if (ch.avatar_small_url || ch.avatar_url) {
          setAvatarUrl(ch.avatar_small_url || ch.avatar_url);
        }
      }
    }
    fetchAuthor();

    return () => {
      mounted = false;
    };
  }, [video?.author_id, getChannelByAuthorId]);


  return (
    <div className="video-card" onClick={() => navigate(`/watch?v=${video.id}`)}>
      <div className="video-card__thumbnail">
        {video.thumbnail_url ? (
          <img
            className="video-card__thumbnail-img"
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
          />
        ) : (
          <div
            className="video-card__thumbnail-img"
            style={{
              background: `linear-gradient(135deg, ${getAvatarColor(video.id)} 0%, ${getAvatarColor(video.id)}88 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '32px',
              fontWeight: 700,
            }}
          >
            {video.title?.[0]?.toUpperCase() || 'V'}
          </div>
        )}
        {video.duration_seconds > 0 && (
          <span className="video-card__duration">{formatDuration(video.duration_seconds)}</span>
        )}
      </div>
      <div className="video-card__info">
        <Avatar
          src={avatarUrl}
          name={authorChannel?.name}
          userId={video.author_id}
          size={36}
          className="video-card__avatar"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/channel/${authorChannel?.handle || video.author_id}`);
          }}
        />

        <div className="video-card__meta">
          <div className="video-card__title" title={video.title}>{video.title}</div>
          <div
            className="video-card__channel"
            style={{ cursor: 'pointer', textDecoration: 'none' }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/channel/${authorChannel?.handle || video.author_id}`);
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            {authorChannel?.name || `Автор #${video.author_id}`}
          </div>
          <div className="video-card__stats">
            {formatViews(video.views_count)} • {timeAgo(video.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
