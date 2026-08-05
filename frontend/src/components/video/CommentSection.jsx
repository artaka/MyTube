import { useState, useEffect } from 'react';
import { getComments, createComment, setCommentActivity } from '../../api/video';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo, formatCount } from '../common/format';
import { ThumbUpIcon, ThumbDownIcon } from '../common/Icons';
import { Spinner } from '../common/Spinner';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getColor(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function CommentSection({ videoId }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    getComments(videoId, 1, 100, token)
      .then((data) => {
        setComments(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId, token]);

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
          likes_count: prevLikes + (prevActivity === 'dislike' ? 1 : 1),
        };
      })
    );

    try {
      const updated = await setCommentActivity(token, comment.id, 'like');
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
    } catch {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== comment.id) return c;
          return { ...c, viewer_activity: prevActivity, likes_count: prevLikes };
        })
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
          return { ...c, viewer_activity: null, likes_count: prevLikes };
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
        prev.map((c) => {
          if (c.id !== comment.id) return c;
          return { ...c, viewer_activity: prevActivity, likes_count: prevLikes };
        })
      );
    }
  };

  return (
    <div className="comments">
      <div className="comments__header">
        <span>{total} комментариев</span>
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
                  placeholder="Введите комментарий..."
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
                  {submitting ? '...' : 'Комментировать'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="comments__input-row" onClick={() => setShowInput(true)} style={{ cursor: 'pointer' }}>
            <div className="comments__input-avatar">
              {user?.username?.[0] || 'U'}
            </div>
            <div style={{ flex: 1, borderBottom: '1px solid var(--yt-border)', paddingBottom: 4, fontSize: 14, color: 'var(--yt-text-secondary)' }}>
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
        comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="comment-item__avatar" style={{ background: getColor(c.author_id) }}>
              {String(c.author_id)[0]}
            </div>
            <div className="comment-item__content">
              <div className="comment-item__header">
                <span className="comment-item__author">Пользователь #{c.author_id}</span>
                <span className="comment-item__time">{timeAgo(c.created_at)}</span>
              </div>
              <div className="comment-item__text">{c.text}</div>
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
        ))
      )}
    </div>
  );
}
