import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChannel } from '../context/ChannelContext';
import { patchCurrentUser, deleteUser } from '../api/auth';
import * as channelsApi from '../api/channels';

export default function SettingsPage() {
  const { token, user, logout } = useAuth();
  const { myChannel, refreshMyChannel, getPhotoUrl } = useChannel();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'channel'

  // Profile Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Channel Form States
  const [channelName, setChannelName] = useState('');
  const [channelHandle, setChannelHandle] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelCountry, setChannelCountry] = useState('');
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelSuccess, setChannelSuccess] = useState('');
  const [channelError, setChannelError] = useState('');

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (myChannel) {
      setChannelName(myChannel.name || '');
      setChannelHandle(myChannel.handle || '');
      setChannelDesc(myChannel.description || '');
      setChannelCountry(myChannel.country || '');

      getPhotoUrl(myChannel.id, 'avatar').then((url) => {
        if (url) setAvatarUrl(url);
      });
      getPhotoUrl(myChannel.id, 'banner').then((url) => {
        if (url) setBannerUrl(url);
      });
    }
  }, [myChannel, getPhotoUrl]);

  if (!token || !user) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>Войдите в аккаунт для изменения настроек</h2>
      </div>
    );
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    const payload = {};
    if (username !== user.username) payload.username = username;
    if (email !== user.email) payload.email = email;
    if (password) payload.password = password;

    if (Object.keys(payload).length === 0) {
      setProfileLoading(false);
      setProfileSuccess('Никаких изменений не сделано.');
      return;
    }

    try {
      await patchCurrentUser(token, payload);
      setProfileSuccess('Профиль успешно обновлен!');
      setPassword('');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChannelSubmit = async (e) => {
    e.preventDefault();
    setChannelLoading(true);
    setChannelSuccess('');
    setChannelError('');

    try {
      await channelsApi.updateChannel(token, {
        name: channelName,
        handle: channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`,
        description: channelDesc,
        country: channelCountry,
      });
      setChannelSuccess('Настройки канала сохранены!');
      await refreshMyChannel();
    } catch (err) {
      setChannelError(err.message);
    } finally {
      setChannelLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setChannelError('');
    try {
      await channelsApi.uploadChannelPhoto(token, file, 'avatar');
      if (myChannel) {
        const res = await channelsApi.getChannelPhotoUrl(myChannel.id, 'avatar');
        if (res?.url) setAvatarUrl(`${res.url}?t=${Date.now()}`);
      }
      setChannelSuccess('Аватар канала обновлен!');
      await refreshMyChannel();
    } catch (err) {
      setChannelError(`Ошибка загрузки аватара: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setChannelError('');
    try {
      await channelsApi.uploadChannelPhoto(token, file, 'banner');
      if (myChannel) {
        const res = await channelsApi.getChannelPhotoUrl(myChannel.id, 'banner');
        if (res?.url) setBannerUrl(`${res.url}?t=${Date.now()}`);
      }
      setChannelSuccess('Баннер канала обновлен!');
      await refreshMyChannel();
    } catch (err) {
      setChannelError(`Ошибка загрузки баннера: ${err.message}`);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('ВНИМАНИЕ: Ваш аккаунт и связанные данные будут безвозвратно удалены. Продолжить?')) return;
    try {
      await deleteUser(token, user.id);
      logout();
      navigate('/');
    } catch (err) {
      alert(`Ошибка удаления аккаунта: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 16px', paddingBottom: 64 }}>
      <h1 style={{ marginBottom: 20, fontSize: 26, fontWeight: 700 }}>Настройки</h1>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--yt-border)', marginBottom: 28 }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid var(--yt-text)' : '2px solid transparent',
            color: activeTab === 'profile' ? 'var(--yt-text)' : 'var(--yt-text-secondary)',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Учетная запись
        </button>
        <button
          onClick={() => setActiveTab('channel')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'channel' ? '2px solid var(--yt-text)' : '2px solid transparent',
            color: activeTab === 'channel' ? 'var(--yt-text)' : 'var(--yt-text-secondary)',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Мой канал
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div>
          <div style={{ background: 'var(--yt-bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Информация о пользователе</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14 }}>
              <div style={{ color: 'var(--yt-text-secondary)' }}>ID аккаунта:</div>
              <div>#{user.id}</div>
              <div style={{ color: 'var(--yt-text-secondary)' }}>Статус:</div>
              <div>{user.is_active ? 'Активен' : 'Неактивен'}</div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="modal__field">
              <label>Имя пользователя</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label>Электронная почта (Email)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label>Новый пароль (оставьте пустым для сохранения текущего)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 3 символа"
              />
            </div>

            {profileSuccess && (
              <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '12px', borderRadius: 8, fontSize: 14 }}>
                {profileSuccess}
              </div>
            )}
            {profileError && <div className="modal__error">{profileError}</div>}

            <button
              type="submit"
              disabled={profileLoading}
              className="modal__submit"
              style={{ width: 'fit-content', padding: '10px 24px', alignSelf: 'flex-start' }}
            >
              {profileLoading ? 'Сохранение...' : 'Сохранить профиль'}
            </button>
          </form>

          {/* Danger Zone */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--yt-border)' }}>
            <h3 style={{ fontSize: 16, color: '#cc0000', marginBottom: 8 }}>Опасная зона</h3>
            <p style={{ fontSize: 13, color: 'var(--yt-text-secondary)', marginBottom: 16 }}>
              Удаление аккаунта приведет к безвозвратной потере доступа ко всем вашим данным.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              style={{
                background: 'transparent',
                border: '1px solid #cc0000',
                color: '#cc0000',
                padding: '9px 18px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Удалить мой аккаунт
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Channel */}
      {activeTab === 'channel' && (
        <div>
          {/* Avatar & Banner upload area */}
          <div style={{ background: 'var(--yt-bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Оформление канала</h3>

            {/* Banner Preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--yt-text-secondary)', marginBottom: 6 }}>Баннер канала (2560x423):</div>
              <div style={{
                width: '100%',
                height: 120,
                borderRadius: 8,
                overflow: 'hidden',
                background: bannerUrl ? `url(${bannerUrl}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--yt-border)',
              }}>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {uploadingBanner ? 'Загрузка...' : 'Загрузить баннер'}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleBannerChange}
                />
              </div>
            </div>

            {/* Avatar Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (channelName?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    background: 'var(--yt-chip-bg)',
                    color: 'var(--yt-text)',
                    border: '1px solid var(--yt-border)',
                    borderRadius: 20,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {uploadingAvatar ? 'Загрузка...' : 'Сменить аватар'}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <div style={{ fontSize: 12, color: 'var(--yt-text-secondary)', marginTop: 4 }}>
                  Рекомендуется изображение 512х512 в формате PNG, JPG или WEBP
                </div>
              </div>
            </div>
          </div>

          {/* Channel Info Form */}
          <form onSubmit={handleChannelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="modal__field">
              <label>Название канала</label>
              <input
                type="text"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label>Handle (@псевдоним)</label>
              <input
                type="text"
                required
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label>Описание канала</label>
              <textarea
                rows={4}
                value={channelDesc}
                onChange={(e) => setChannelDesc(e.target.value)}
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
                value={channelCountry}
                onChange={(e) => setChannelCountry(e.target.value)}
              />
            </div>

            {channelSuccess && (
              <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '12px', borderRadius: 8, fontSize: 14 }}>
                {channelSuccess}
              </div>
            )}
            {channelError && <div className="modal__error">{channelError}</div>}

            <button
              type="submit"
              disabled={channelLoading}
              className="modal__submit"
              style={{ width: 'fit-content', padding: '10px 24px', alignSelf: 'flex-start' }}
            >
              {channelLoading ? 'Сохранение...' : 'Сохранить канал'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
