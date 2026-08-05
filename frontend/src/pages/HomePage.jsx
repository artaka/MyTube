import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed';
import VideoGrid from '../components/video/VideoGrid';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';

export default function HomePage() {
  const { videos, loading, error, page, totalPages, loadMore } = useFeed();
  const [searchParams] = useSearchParams();
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

  const query = searchParams.get('q');

  return (
    <div>
      <div className="chips">
        <button className="chip chip--active">Все</button>
        <button className="chip">Музыка</button>
        <button className="chip">Игры</button>
        <button className="chip">Новости</button>
        <button className="chip">Наука</button>
        <button className="chip">Программирование</button>
        <button className="chip">Фильмы</button>
        <button className="chip">Кулинария</button>
        <button className="chip">Спорт</button>
      </div>

      {query && (
        <div style={{ padding: '16px 24px', fontSize: 16, color: 'var(--yt-text-secondary)' }}>
          Результаты поиска: «{query}»
        </div>
      )}

      {error && (
        <div style={{ padding: 16, color: '#cc0000', textAlign: 'center' }}>
          Ошибка: {error}
        </div>
      )}

      <VideoGrid videos={videos} />

      <div ref={sentinelRef} />

      {loading && <Spinner />}

      {!loading && videos.length === 0 && (
        <EmptyState icon="🎬" text="Пока нет видео" />
      )}

      {isAtEnd && videos.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--yt-text-secondary)', fontSize: 14 }}>
          Вы посмотрели все видео
        </div>
      )}
    </div>
  );
}
