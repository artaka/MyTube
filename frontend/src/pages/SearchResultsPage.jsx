import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFeed } from '../api/video';
import { formatDuration, formatViews, timeAgo } from '../components/common/format';
import { useChannel } from '../context/ChannelContext';
import { Spinner } from '../components/common/Spinner';
import Avatar from '../components/common/Avatar';


export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('search_query') || '';
  const { getChannelByAuthorId } = useChannel();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorsMap, setAuthorsMap] = useState({});

  useEffect(() => {
    setLoading(true);
    getFeed(1, 100)
      .then((data) => {
        const allItems = data.items || [];
        const q = query.toLowerCase().trim();
        const filtered = allItems.filter((v) => {
          if (!q) return true;
          const matchTitle = (v.title || '').toLowerCase().includes(q);
          const matchDesc = (v.description || '').toLowerCase().includes(q);
          const matchAuthor = String(v.author_id).includes(q);
          return matchTitle || matchDesc || matchAuthor;
        });
        setVideos(filtered);

        // Fetch authors info
        filtered.forEach(async (v) => {
          try {
            const ch = await getChannelByAuthorId(v.author_id);
            if (ch) {
              setAuthorsMap((prev) => ({
                ...prev,
                [v.author_id]: {
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
  }, [query, getChannelByAuthorId]);


  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
        Результаты поиска по запросу «{query}» ({videos.length})
      </h2>

      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--yt-text-secondary)' }}>
          <h3>По вашему запросу ничего не найдено</h3>
          <p style={{ marginTop: 8 }}>Попробуйте ввести другие ключевые слова.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {videos.map((v) => {
            const author = authorsMap[v.author_id];
            return (
              <div
                key={v.id}
                onClick={() => navigate(`/watch?v=${v.id}`)}
                style={{
                  display: 'flex',
                  gap: 16,
                  cursor: 'pointer',
                  borderRadius: 12,
                  padding: 8,
                  transition: 'background 0.2s',
                  flexWrap: 'wrap',
                }}
                className="search-result-card"
              >
                {/* Thumbnail */}
                <div style={{
                  width: 'clamp(240px, 35vw, 360px)',
                  aspectRatio: '16/9',
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                  background: 'var(--yt-bg-secondary)',
                }}>
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#fff', fontSize: 24, fontWeight: 700 }}>
                      {v.title?.[0]?.toUpperCase() || 'V'}
                    </div>
                  )}
                  {v.duration_seconds > 0 && (
                    <span className="video-card__duration">{formatDuration(v.duration_seconds)}</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--yt-text)', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {v.title}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--yt-text-secondary)', marginBottom: 12 }}>
                    {formatViews(v.views_count)} • {timeAgo(v.created_at)}
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/channel/${author?.handle || v.author_id}`);
                    }}
                  >
                    <Avatar
                      src={author?.avatar}
                      name={author?.name}
                      userId={v.author_id}
                      size={28}
                    />
                    <span style={{ fontSize: 13, color: 'var(--yt-text-secondary)', fontWeight: 500 }}>
                      {author?.name || `@user_${v.author_id}`}
                    </span>
                  </div>

                  {v.description && (
                    <p style={{
                      fontSize: 13,
                      color: 'var(--yt-text-secondary)',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}>
                      {v.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
