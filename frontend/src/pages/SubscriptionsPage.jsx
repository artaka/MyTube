import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { useChannel } from '../context/ChannelContext';
import { getUserVideos } from '../api/video';
import VideoCard from '../components/video/VideoCard';
import { Spinner } from '../components/common/Spinner';
import Avatar from '../components/common/Avatar';

import { formatCount } from '../components/common/format';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function SubscriptionsPage() {
  const { token, user } = useAuth();
  const { openAuth } = useAuthModal();
  const { subscriptions, subscriptionsLoading, getPhotoUrl, toggleSub } = useChannel();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [avatarsMap, setAvatarsMap] = useState({});

  // Load avatars for all subscriptions
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;

    subscriptions.forEach(async (ch) => {
      try {
        const url = await getPhotoUrl(ch.id, 'avatar');
        if (url) {
          setAvatarsMap((prev) => ({ ...prev, [ch.id]: url }));
        }
      } catch {}
    });
  }, [subscriptions, getPhotoUrl]);

  // Load feed of videos from subscribed channels
  useEffect(() => {
    if (!token) {
      setLoadingVideos(false);
      return;
    }

    if (!subscriptionsLoading && subscriptions.length === 0) {
      setVideos([]);
      setLoadingVideos(false);
      return;
    }

    const loadSubscribedVideos = async () => {
      setLoadingVideos(true);
      try {
        const allPromises = subscriptions.map((ch) =>
          getUserVideos(ch.owner_id, 0, 20).catch(() => ({ items: [] }))
        );
        const results = await Promise.all(allPromises);
        const combined = results.flatMap((r) => r.items || []);
        // Sort descending by created_at
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setVideos(combined);
      } catch (err) {
        console.error('Error fetching subscription videos:', err);
      } finally {
        setLoadingVideos(false);
      }
    };

    if (subscriptions.length > 0) {
      loadSubscribedVideos();
    }
  }, [token, subscriptions, subscriptionsLoading]);

  if (!token) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Не пропустите новые видео</h2>
        <p style={{ color: 'var(--yt-text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          Войдите в аккаунт, чтобы подписаться на каналы и всегда быть в курсе выхода свежих роликов.
        </p>
        <button
          onClick={openAuth}
          style={{
            background: '#065fd4',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 20,
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Войти
        </button>
      </div>
    );
  }

  if (subscriptionsLoading) return <Spinner />;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Подписки</h1>

      {/* Subscribed Channels List Bar */}
      {subscriptions.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 16,
          marginBottom: 28,
          borderBottom: '1px solid var(--yt-border)',
        }}>
          {subscriptions.map((ch) => {
            const avatar = avatarsMap[ch.id];
            return (
              <div
                key={ch.id}
                onClick={() => navigate(`/channel/${ch.handle || ch.owner_id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  minWidth: 80,
                  maxWidth: 96,
                  textAlign: 'center',
                }}
              >
                <Avatar
                  src={avatar || ch.avatar_url || ch.avatar_small_url}
                  name={ch.name}
                  userId={ch.owner_id}
                  size={56}
                  style={{
                    marginBottom: 6,
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                />

                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  color: 'var(--yt-text)',
                }}>
                  {ch.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--yt-text-secondary)' }}>
                  {formatCount(ch.subscribers_counter || 0)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Videos Feed */}
      {loadingVideos ? (
        <Spinner />
      ) : subscriptions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--yt-text-secondary)' }}>
          <h3>Вы еще не подписаны ни на один канал</h3>
          <p style={{ marginTop: 8, marginBottom: 20 }}>
            Исследуйте видео на главной странице и подписывайтесь на интересных авторов.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--yt-chip-bg-active)',
              color: 'var(--yt-chip-text-active)',
              padding: '10px 20px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Смотреть главную
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--yt-text-secondary)' }}>
          На ваших подписанных каналах пока нет новых видео.
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
