import { useState, useEffect, useCallback } from 'react';
import { getFeed } from '../api/video';

export function useFeed() {
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFeed = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeed(pageNum, 20);
      setVideos((prev) => (pageNum === 1 ? data.items : [...prev, ...data.items]));
      setTotalPages(Math.ceil(data.total / data.size));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) {
      const next = page + 1;
      setPage(next);
      loadFeed(next);
    }
  }, [page, totalPages, loading, loadFeed]);

  const refresh = useCallback(() => {
    setPage(1);
    loadFeed(1);
  }, [loadFeed]);

  return { videos, loading, error, page, totalPages, loadMore, refresh };
}
