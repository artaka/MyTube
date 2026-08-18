import { useState, useEffect, useMemo } from 'react';
import { getComments, createComment, setCommentActivity } from '../../api/video';
import { useAuth } from '../../hooks/useAuth';
import { useChannel } from '../../context/ChannelContext';
import { timeAgo, formatCount } from '../common/format';
import { ThumbUpIcon, ThumbDownIcon } from '../common/Icons';
import { Spinner } from '../common/Spinner';
import Avatar from '../common/Avatar';


const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function CommentSection({ videoId, onTimecodeClick }) {
  const { token, user } = useAuth();
  const { getChannelByAuthorId } = useChannel();

  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'top'
  const [authorsMap, setAuthorsMap] = useState({});

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    getComments(videoId, 1, 100, token)
      .then((data) => {
        const items = data.items || [];
        setComments(items);
        setTotal(data.total || items.length);

        // Resolve authors in background
        items.forEach(async (c) => {
          try {
            const ch = await getChannelByAuthorId(c.author_id);
            if (ch) {
              setAuthorsMap((prev) => ({
                ...prev,
                [c.author_id]: {
                  name: ch.name,
                  handle: ch.handle,
                  avatar: ch.avatar_small_url || ch.avatar_url,
                },
              }));
            }
          } catch {}
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId, token, getChannelByAuthorId]);


  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortBy === 'top') {
      return list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [comments, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(token, videoId, newComment.trim());
      setComments((prev) => [c, ...prev]);
      setTotal((n) => n + 1);
      setNewComment('');
      setShowInput(false);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (comment) => {
    if (!token) return;
    const prevActivity = comment.viewer_activity;
    const prevLikes = comment.likes_count || 0;
    const isAlreadyLiked = prevActivity === 'like';

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== comment.id) return c;
        if (isAlreadyLiked) {
          return { ...c, viewer_activity: null, likes_count: Math.max(0, prevLikes - 1) };
        }
        return {
          ...c,
          viewer_activity: 'like',
          likes_count: prevLikes + 1,
        };
      })
    );

    try {
      const updated = await setCommentActivity(token, comment.id, 'like');
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, viewer_activity: prevActivity, likes_count: prevLikes } : c))
      );
    }
  };

  const handleDislike = async (comment) => {
    if (!token) return;
    const prevActivity = comment.viewer_activity;
    const prevLikes = comment.likes_count || 0;
    const isAlreadyDisliked = prevActivity === 'dislike';

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== comment.id) return c;
        if (isAlreadyDisliked) {
          return { ...c, viewer_activity: null };
        }
        return {
          ...c,
          viewer_activity: 'dislike',
          likes_count: prevActivity === 'like' ? Math.max(0, prevLikes - 1) : prevLikes,
        };
      })
    );

    try {
      const updated = await setCommentActivity(token, comment.id, 'dislike');
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, viewer_activity: prevActivity, likes_count: prevLikes } : c))
      );
    }
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const timecodeRegex = /(\b(?:[0-5]?\d:)?[0-5]?\d:[0-5]\d\b)/g;
    const parts = text.split(timecodeRegex);
    return parts.map((part, index) => {
      if (timecodeRegex.test(part)) {
        return (
          <span
            key={index}
            onClick={() => onTimecodeClick?.(part)}
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
    <div className="comments">
      <div className="comments__header" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{total} комментариев</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--yt-text-secondary)' }}>Сортировка:</span>
          <button
            onClick={() => setSortBy('newest')}
            style={{
              background: sortBy === 'newest' ? 'var(--yt-chip-bg-active)' : 'transparent',
              color: sortBy === 'newest' ? 'var(--yt-chip-text-active)' : 'var(--yt-text-secondary)',
              border: 'none',
              borderRadius: 16,
              padding: '4px 10px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Сначала новые
          </button>
          <button
            onClick={() => setSortBy('top')}
            style={{
              background: sortBy === 'top' ? 'var(--yt-chip-bg-active)' : 'transparent',
              color: sortBy === 'top' ? 'var(--yt-chip-text-active)' : 'var(--yt-text-secondary)',
              border: 'none',
              borderRadius: 16,
              padding: '4px 10px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Популярные
          </button>
        </div>
      </div>

      {token ? (
        showInput ? (
          <form className="comments__input-row" onSubmit={handleSubmit}>
            <div className="comments__input-avatar">
              {user?.username?.[0] || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <div className="comments__input-wrapper">
                <input
                  type="text"
                  placeholder="Введите комментарий (можно указать таймкод, например 01:20)..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="comments__input-actions">
                <button
                  type="button"
                  className="comments__cancel-btn"
                  onClick={() => { setShowInput(false); setNewComment(''); }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`comments__submit-btn ${newComment.trim() ? 'comments__submit-btn--active' : ''}`}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? '...' : 'Оставить комментарий'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="comments__input-row" onClick={() => setShowInput(true)} style={{ cursor: 'pointer' }}>
            <div className="comments__input-avatar">
              {user?.username?.[0] || 'U'}
            </div>
            <div style={{ flex: 1, borderBottom: '1px solid var(--yt-border)', paddingBottom: 6, fontSize: 14, color: 'var(--yt-text-secondary)' }}>
              Введите комментарий...
            </div>
          </div>
        )
      ) : (
        <div className="comments__input-row" style={{ justifyContent: 'center', color: 'var(--yt-text-secondary)', fontSize: 14 }}>
          Войдите, чтобы оставить комментарий
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        sortedComments.map((c) => {
          const author = authorsMap[c.author_id];
          return (
            <div key={c.id} className="comment-item">
              <Avatar
                src={author?.avatar}
                name={author?.name}
                userId={c.author_id}
                size={36}
                className="comment-item__avatar"
              />
              <div className="comment-item__content">

                <div className="comment-item__header">
                  <span className="comment-item__author">{author?.name || `@user_${c.author_id}`}</span>
                  <span className="comment-item__time">{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-item__text">{renderCommentText(c.text)}</div>
                <div className="comment-item__actions">
                  <button
                    className={`comment-item__like-btn ${c.viewer_activity === 'like' ? 'comment-item__like-btn--active' : ''}`}
                    onClick={() => handleLike(c)}
                    title="Нравится"
                  >
                    <ThumbUpIcon filled={c.viewer_activity === 'like'} size={20} />
                    {c.likes_count > 0 && <span>{formatCount(c.likes_count)}</span>}
                  </button>
                  <button
                    className={`comment-item__like-btn ${c.viewer_activity === 'dislike' ? 'comment-item__like-btn--active' : ''}`}
                    onClick={() => handleDislike(c)}
                    title="Не нравится"
                  >
                    <ThumbDownIcon filled={c.viewer_activity === 'dislike'} size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
