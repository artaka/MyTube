import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { useChannel } from '../context/ChannelContext';
import { getUserVideos, deleteVideo } from '../api/video';
import * as channelsApi from '../api/channels';
import VideoCard from '../components/video/VideoCard';
import { Spinner } from '../components/common/Spinner';
import Avatar from '../components/common/Avatar';

import { formatCount, formatViews } from '../components/common/format';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ChannelPage() {
  const { idOrHandle } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { openAuth } = useAuthModal();
  const { isSubscribed, toggleSub, refreshMyChannel } = useChannel();

  const [channel, setChannel] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'about'
  const [subscribing, setSubscribing] = useState(false);

  // Edit Channel Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const isOwner = user && channel && user.id === channel.owner_id;
  const subscribed = channel ? isSubscribed(channel.id) : false;

  const loadChannelData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const candidates = [idOrHandle];
      if (String(idOrHandle).startsWith('@')) {
        candidates.push(String(idOrHandle).slice(1));
      } else {
        candidates.push(`@${idOrHandle}`);
      }

      let chData = null;
      for (const candidate of candidates) {
        try {
          chData = await channelsApi.getChannel(candidate);
          if (chData) break;
        } catch {}
      }

      // If owner viewing their channel and it was not found, create it
      if (!chData && token && user && (String(idOrHandle) === String(user.id) || String(idOrHandle) === user.username || String(idOrHandle) === `@${user.username}`)) {
        try {
          chData = await channelsApi.createChannel(token);
        } catch {}
      }

      if (!chData) {
        throw new Error('Канал не найден');
      }

      setChannel(chData);
      setEditName(chData.name || '');
      setEditHandle(chData.handle || '');
      setEditDesc(chData.description || '');
      setEditCountry(chData.country || '');


      // Load avatar & banner from storage
      try {
        const aRes = await channelsApi.getChannelPhotoUrl(chData.id, 'avatar');
        if (aRes?.url) setAvatarUrl(aRes.url);
      } catch {}

      try {
        const bRes = await channelsApi.getChannelPhotoUrl(chData.id, 'banner');
        if (bRes?.url) setBannerUrl(bRes.url);
      } catch {}

      // Load videos for this author
      const vRes = await getUserVideos(chData.owner_id, 0, 100);
      setVideos(vRes.items || []);

    } catch (err) {
      console.error('Channel load error:', err);
      setError(err.message || 'Ошибка загрузки канала');
    } finally {
      setLoading(false);
    }
  }, [idOrHandle]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  const handleSubscribeToggle = async () => {
    if (!token) {
      openAuth();
      return;
    }
    if (!channel) return;
    setSubscribing(true);
    try {
      const nowSubbed = await toggleSub(channel.id);
      setChannel((prev) => ({
        ...prev,
        subscribers_counter: Math.max(0, (prev.subscribers_counter || 0) + (nowSubbed ? 1 : -1)),
      }));
    } catch (err) {
      alert(`Ошибка: ${err.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Вы действительно хотите удалить это видео?')) return;
    try {
      await deleteVideo(token, videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setChannel((prev) => ({
        ...prev,
        videos_counter: Math.max(0, (prev.videos_counter || 1) - 1),
      }));
    } catch (err) {
      alert(`Не удалось удалить видео: ${err.message}`);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setEditError('');
    try {
      await channelsApi.uploadChannelPhoto(token, file, 'avatar');
      // Reload photo url
      const res = await channelsApi.getChannelPhotoUrl(channel.id, 'avatar');
      if (res?.url) {
        setAvatarUrl(`${res.url}?t=${Date.now()}`);
      }
      setEditSuccess('Аватар обновлен!');
      await refreshMyChannel();
    } catch (err) {
      setEditError(`Ошибка загрузки аватара: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setEditError('');
    try {
      await channelsApi.uploadChannelPhoto(token, file, 'banner');
      // Reload photo url
      const res = await channelsApi.getChannelPhotoUrl(channel.id, 'banner');
      if (res?.url) {
        setBannerUrl(`${res.url}?t=${Date.now()}`);
      }
      setEditSuccess('Баннер канала обновлен!');
      await refreshMyChannel();
    } catch (err) {
      setEditError(`Ошибка загрузки баннера: ${err.message}`);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveChannelDetails = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    try {
      const updated = await channelsApi.updateChannel(token, {
        name: editName,
        handle: editHandle.startsWith('@') ? editHandle : `@${editHandle}`,
        description: editDesc,
        country: editCountry,
      });
      setChannel(updated);
      setEditSuccess('Информация о канале успешно сохранена!');
      await refreshMyChannel();
      setTimeout(() => setShowEditModal(false), 1200);
    } catch (err) {
      setEditError(err.message);
    }
  };

  if (loading) return <Spinner />;

  if (error || !channel) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, color: 'var(--yt-text)', marginBottom: 12 }}>Канал не найден</h2>
        <p style={{ color: 'var(--yt-text-secondary)', marginBottom: 24 }}>{error || 'Возможно, ссылка устарела или канал был удален.'}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--yt-chip-bg-active)',
            color: 'var(--yt-chip-text-active)',
            padding: '10px 24px',
            borderRadius: 20,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 48 }}>
      {/* Banner */}
      <div style={{
        width: '100%',
        height: bannerUrl ? 'clamp(140px, 20vw, 240px)' : '100px',
        backgroundColor: bannerUrl ? 'transparent' : 'rgba(255,255,255,0.05)',
        backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}>
        {isOwner && (
          <button
            onClick={() => bannerInputRef.current?.click()}
            style={{
              position: 'absolute',
              right: 16,
              bottom: 16,
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
            </svg>
            {uploadingBanner ? 'Загрузка...' : 'Изменить баннер'}
          </button>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleBannerUpload}
        />
      </div>

      {/* Channel Header Info */}
      <div style={{ padding: '24px 24px 16px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <Avatar
            src={avatarUrl}
            name={channel.name}
            userId={channel.owner_id}
            size={120}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          />

          {isOwner && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#065fd4',
                color: '#fff',
                borderRadius: '50%',
                width: 34,
                height: 34,
                border: '2px solid var(--yt-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Сменить аватар"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M4 4h3l2-2h6l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 14a5 5 0 100-10 5 5 0 000 10z" />
              </svg>
            </button>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>

        {/* Text details */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--yt-text)' }}>
            {channel.name}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--yt-text-secondary)', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--yt-text)' }}>{channel.handle}</span>
            <span>•</span>
            <span>{formatCount(channel.subscribers_counter || 0)} подписчиков</span>
            <span>•</span>
            <span>{channel.videos_counter || videos.length} видео</span>
          </div>

          {channel.description && (
            <p style={{ fontSize: 14, color: 'var(--yt-text-secondary)', margin: '0 0 16px 0', maxWidth: 700, lineHeight: 1.4 }}>
              {channel.description}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {isOwner ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    background: 'var(--yt-chip-bg)',
                    color: 'var(--yt-chip-text)',
                    padding: '9px 18px',
                    borderRadius: 20,
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                    border: '1px solid var(--yt-border)',
                  }}
                >
                  Настроить вид канала
                </button>
                <button
                  onClick={() => navigate('/upload')}
                  style={{
                    background: 'var(--yt-chip-bg-active)',
                    color: 'var(--yt-chip-text-active)',
                    padding: '9px 18px',
                    borderRadius: 20,
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Управление видео
                </button>
              </>
            ) : (
              <button
                onClick={handleSubscribeToggle}
                disabled={subscribing}
                style={{
                  background: subscribed ? 'rgba(255,255,255,0.1)' : 'var(--yt-chip-bg-active)',
                  color: subscribed ? 'var(--yt-text)' : 'var(--yt-chip-text-active)',
                  padding: '10px 22px',
                  borderRadius: 24,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  border: subscribed ? '1px solid var(--yt-border)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {subscribed ? (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                    Вы подписаны
                  </>
                ) : (
                  'Подписаться'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--yt-border)', padding: '0 24px', margin: '16px 0 24px' }}>
        <button
          onClick={() => setActiveTab('videos')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'videos' ? '2px solid var(--yt-text)' : '2px solid transparent',
            color: activeTab === 'videos' ? 'var(--yt-text)' : 'var(--yt-text-secondary)',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Видео ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab('about')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'about' ? '2px solid var(--yt-text)' : '2px solid transparent',
            color: activeTab === 'about' ? 'var(--yt-text)' : 'var(--yt-text-secondary)',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          О канале
        </button>
      </div>

      {/* Tab Content: Videos */}
      {activeTab === 'videos' && (
        <div style={{ padding: '0 24px' }}>
          {videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--yt-text-secondary)' }}>
              <h3>На этом канале пока нет видео</h3>
              {isOwner && (
                <button
                  onClick={() => navigate('/upload')}
                  style={{
                    marginTop: 16,
                    background: '#065fd4',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Загрузить первое видео
                </button>
              )}
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((v) => (
                <div key={v.id} style={{ position: 'relative' }}>
                  <VideoCard video={v} />
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVideo(v.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(204, 0, 0, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        zIndex: 10,
                      }}
                      title="Удалить видео"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: About */}
      {activeTab === 'about' && (
        <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          <div style={{ background: 'var(--yt-bg-secondary)', padding: 24, borderRadius: 12 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Описание</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--yt-text-secondary)' }}>
              {channel.description || 'Автор еще не заполнил описание канала.'}
            </p>
          </div>
          <div style={{ background: 'var(--yt-bg-secondary)', padding: 24, borderRadius: 12 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Статистика</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--yt-border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--yt-text-secondary)' }}>Страна:</span>
                <span>{channel.country || 'Не указана'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--yt-border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--yt-text-secondary)' }}>Всего просмотров:</span>
                <span style={{ fontWeight: 600 }}>{formatViews(channel.views_counter || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--yt-border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--yt-text-secondary)' }}>Всего отметок «Нравится»:</span>
                <span style={{ fontWeight: 600 }}>{formatCount(channel.likes_counter || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--yt-border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--yt-text-secondary)' }}>Подписчиков:</span>
                <span style={{ fontWeight: 600 }}>{formatCount(channel.subscribers_counter || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--yt-text-secondary)' }}>Дата регистрации:</span>
                <span>{new Date(channel.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal__title">Настройки канала</div>

            {editSuccess && <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 12 }}>{editSuccess}</div>}
            {editError && <div className="modal__error">{editError}</div>}

            <form onSubmit={handleSaveChannelDetails} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="modal__field">
                <label>Название канала</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Название канала"
                />
              </div>

              <div className="modal__field">
                <label>Handle (@псевдоним)</label>
                <input
                  type="text"
                  required
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  placeholder="@my_channel"
                />
              </div>

              <div className="modal__field">
                <label>Описание</label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Расскажите зрителям о своем канале"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--yt-bg)',
                    border: '1px solid var(--yt-border)',
                    color: 'var(--yt-text)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div className="modal__field">
                <label>Страна</label>
                <input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="Россия / RU"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--yt-border)',
                    color: 'var(--yt-text)',
                    padding: '10px 18px',
                    borderRadius: 20,
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="modal__submit"
                  style={{ width: 'auto', padding: '10px 24px' }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
