import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFeed } from '../hooks/useFeed';
import VideoGrid from '../components/video/VideoGrid';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';

const CATEGORIES = [
  'Все',
  'Новые',
  'Популярные',
  'Короткие',
  'Длинные',
  'Музыка',
  'Игры',
  'Новости',
  'Обучение',
  'Фильмы',
];

export default function HomePage() {
  const { videos, loading, error, page, totalPages, loadMore } = useFeed();
  const [activeCategory, setActiveCategory] = useState('Все');
  const sentinelRef = useRef(null);

  const isAtEnd = page >= totalPages;

  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && !isAtEnd) {
        loadMore();
      }
    },
    [loading, isAtEnd, loadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '400px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const filteredVideos = useMemo(() => {
    if (activeCategory === 'Все') return videos;
    if (activeCategory === 'Новые') {
      return [...videos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (activeCategory === 'Популярные') {
      return [...videos].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    }
    if (activeCategory === 'Короткие') {
      return videos.filter((v) => v.duration_seconds > 0 && v.duration_seconds <= 180);
    }
    if (activeCategory === 'Длинные') {
      return videos.filter((v) => v.duration_seconds > 180);
    }
    // Keyword match
    const keyword = activeCategory.toLowerCase();
    return videos.filter(
      (v) =>
        (v.title || '').toLowerCase().includes(keyword) ||
        (v.description || '').toLowerCase().includes(keyword)
    );
  }, [videos, activeCategory]);

  return (
    <div>
      {/* Category Chips Bar */}
      <div className="chips">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'chip--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 16, color: '#cc0000', textAlign: 'center' }}>
          Ошибка: {error}
        </div>
      )}

      <VideoGrid videos={filteredVideos} />

      <div ref={sentinelRef} />

      {loading && <Spinner />}

      {!loading && filteredVideos.length === 0 && (
        <EmptyState icon="🎬" text="Видео в данной категории не найдены" />
      )}

      {isAtEnd && filteredVideos.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--yt-text-secondary)', fontSize: 14 }}>
          Вы посмотрели все видео
        </div>
      )}
    </div>
  );
}
