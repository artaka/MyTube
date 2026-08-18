import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChannel } from '../../context/ChannelContext';
import { SearchIcon, UploadIcon, UserIcon, MenuIcon } from '../common/Icons';
import Avatar from '../common/Avatar';

export default function Header({ onLogin, onMenuToggle }) {
  const { token, user, logout } = useAuth();
  const { myChannel, getPhotoUrl } = useChannel();
  const [query, setQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!myChannel?.id) return;
    getPhotoUrl(myChannel.id, 'avatar_small').then((url) => {
      if (url) setAvatarUrl(url);
    });
  }, [myChannel?.id, getPhotoUrl]);


  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/results?search_query=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const handleMyChannelClick = () => {
    if (myChannel?.handle) {
      navigate(`/channel/${myChannel.handle}`);
    } else {
      navigate(`/channel/${user?.id}`);
    }
    setShowUserMenu(false);
  };

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__menu-btn" onClick={onMenuToggle} title="Меню">
          <MenuIcon />
        </button>
        <a className="header__logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <svg className="header__logo-icon" viewBox="0 0 90 64" width="30" height="22">
            <rect width="90" height="64" rx="16" fill="var(--yt-red)" />
            <polygon points="36,14 36,50 68,32" fill="#fff" />
          </svg>
          <span className="header__logo-text">MyTube</span>
        </a>
      </div>

      <div className="header__center">
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            className="search-bar__input"
            type="text"
            placeholder="Введите запрос"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-bar__btn" type="submit" title="Поиск">
            <SearchIcon />
          </button>
        </form>
      </div>

      <div className="header__right">
        {token ? (
          <>
            <button className="header__upload-btn" onClick={() => navigate('/upload')} title="Создать / Загрузить видео">
              <UploadIcon />
              <span>Создать</span>
            </button>
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                className="header__avatar"
                title={user?.username || 'Профиль'}
                onClick={() => setShowUserMenu((v) => !v)}
                style={{ overflow: 'hidden', padding: 0, border: 'none', background: 'transparent' }}
              >
                <Avatar
                  src={avatarUrl}
                  name={myChannel?.name || user?.username}
                  userId={user?.id}
                  size={32}
                />
              </button>
              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-menu__header">
                    <Avatar
                      src={avatarUrl}
                      name={myChannel?.name || user?.username}
                      userId={user?.id}
                      size={40}
                      className="user-menu__avatar"
                    />
                    <div>
                      <div className="user-menu__name">{myChannel?.name || user?.username}</div>
                      <div className="user-menu__email">{myChannel?.handle || user?.email || ''}</div>
                    </div>
                  </div>

                  <div className="user-menu__divider" />
                  <button className="user-menu__item" onClick={handleMyChannelClick}>
                    Мой канал
                  </button>
                  <button className="user-menu__item" onClick={() => { navigate('/upload'); setShowUserMenu(false); }}>
                    Студия / Загрузка
                  </button>
                  <button className="user-menu__item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                    Настройки аккаунта
                  </button>
                  <div className="user-menu__divider" />
                  <button className="user-menu__item user-menu__item--danger" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="header__login-btn" onClick={onLogin}>
            <UserIcon />
            <span>Войти</span>
          </button>
        )}
      </div>
    </header>
  );
}
