import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SearchIcon, UploadIcon, UserIcon, MenuIcon } from '../common/Icons';

export default function Header({ onLogin, onMenuToggle }) {
  const { token, user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

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
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
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
            <button className="header__upload-btn" onClick={() => navigate('/upload')} title="Загрузить видео">
              <UploadIcon />
              <span>Загрузить</span>
            </button>
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                className="header__avatar"
                title={user?.username || 'Профиль'}
                onClick={() => setShowUserMenu((v) => !v)}
              >
                {user?.username?.[0] || 'U'}
              </button>
              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-menu__header">
                    <div className="user-menu__avatar">
                      {user?.username?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="user-menu__name">{user?.username}</div>
                      <div className="user-menu__email">{user?.email || ''}</div>
                    </div>
                  </div>
                  <div className="user-menu__divider" />
                  <button className="user-menu__item" onClick={() => { navigate('/upload'); setShowUserMenu(false); }}>
                    Ваши видео
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
