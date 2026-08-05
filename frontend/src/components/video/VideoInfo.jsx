import { useState } from 'react';
import { formatViews, timeAgo, formatCount } from '../common/format';
import { ThumbUpIcon, ThumbDownIcon, ShareIcon } from '../common/Icons';

export default function VideoInfo({ video, onActivity }) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);

  if (!video) return null;

  const handleDescToggle = () => {
    setDescExpanded((v) => !v);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    } catch {
    }
    onActivity?.('share');
  };

  return (
    <div className="video-info">
      <h1 className="video-info__title">{video.title}</h1>
      <div className="video-info__stats">
        <span>{formatViews(video.views_count)}</span>
        <span>{timeAgo(video.created_at)}</span>
      </div>

      <div className="video-info__actions">
        <button
          className={`action-btn ${video.viewer_activity === 'like' ? 'action-btn--active' : ''}`}
          onClick={() => onActivity?.('like')}
        >
          <ThumbUpIcon filled={video.viewer_activity === 'like'} />
          {formatCount(video.likes_count)}
        </button>
        <button
          className={`action-btn ${video.viewer_activity === 'dislike' ? 'action-btn--active' : ''}`}
          onClick={() => onActivity?.('dislike')}
        >
          <ThumbDownIcon filled={video.viewer_activity === 'dislike'} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="action-btn"
            onClick={handleShare}
          >
            <ShareIcon />
            Поделиться
          </button>
          {shareTooltip && (
            <div className="share-tooltip">
              Ссылка скопирована
            </div>
          )}
        </div>
      </div>

      {video.description && (
        <div className="video-info__description" onClick={handleDescToggle}>
          <div style={descExpanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {video.description}
          </div>
          {!descExpanded && (
            <div className="video-info__description-toggle">Ещё</div>
          )}
        </div>
      )}
    </div>
  );
}
