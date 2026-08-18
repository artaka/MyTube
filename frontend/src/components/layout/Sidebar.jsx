import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';
import { useChannel } from '../../context/ChannelContext';
import { HomeIcon, ShortsIcon, SubscriptionsIcon, YouIcon, ExploreIcon } from '../common/Icons';
import Avatar from '../common/Avatar';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const mainItems = [
  { icon: 'home', label: 'Главная', path: '/' },
  { icon: 'shorts', label: 'Shorts', path: '/shorts' },
  { icon: 'subscriptions', label: 'Подписки', path: '/subscriptions' },
];

const youItems = [
  { icon: 'you', label: 'Мой канал', path: '/channel' },
];

const iconMap = {
  home: (active) => <HomeIcon active={active} />,
  shorts: () => <ShortsIcon />,
  subscriptions: () => <SubscriptionsIcon />,
  you: () => <YouIcon />,
  explore: () => <ExploreIcon />,
};

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { openAuth } = useAuthModal();
  const { subscriptions, myChannel, getPhotoUrl } = useChannel();
  const [avatarsMap, setAvatarsMap] = useState({});

  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;
    subscriptions.forEach(async (ch) => {
      if (!ch.id || avatarsMap[ch.id]) return;
      try {
        const url = await getPhotoUrl(ch.id, 'avatar_small');
        if (url) {
          setAvatarsMap((prev) => ({ ...prev, [ch.id]: url }));
        }
      } catch {}
    });
  }, [subscriptions, getPhotoUrl, avatarsMap]);


  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/channel') {
      if (myChannel && (location.pathname === `/channel/${myChannel.handle}` || location.pathname === `/channel/${myChannel.id}`)) {
        return true;
      }
      return user ? location.pathname === `/channel/${user.id}` : false;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    if (path === '/channel') {
      if (token && user) {
        if (myChannel?.handle) {
          navigate(`/channel/${myChannel.handle}`);
        } else {
          navigate(`/channel/${user.id}`);
        }
      } else {
        openAuth();
      }
    } else {
      navigate(path);
    }
    onClose?.();
  };

  const renderItem = (item) => (
    <div
      key={item.label}
      className={`sidebar__item ${isActive(item.path) ? 'sidebar__item--active' : ''}`}
      onClick={() => handleNavigate(item.path)}
    >
      <div className="sidebar__item-icon">
        {iconMap[item.icon](isActive(item.path))}
      </div>
      <span className="sidebar__item-label">{item.label}</span>
    </div>
  );

  return (
    <>
      <nav className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        {mainItems.map(renderItem)}
        <div className="sidebar__divider" />
        {youItems.map(renderItem)}

        {/* Subscriptions section */}
        {token && subscriptions && subscriptions.length > 0 && (
          <>
            <div className="sidebar__divider" />
            <div style={{ padding: '8px 16px 4px', fontSize: 14, fontWeight: 600, color: 'var(--yt-text)' }}>
              Подписки
            </div>
            {subscriptions.slice(0, 10).map((ch) => {
              const avatar = avatarsMap[ch.id];
              const isChActive = location.pathname === `/channel/${ch.handle}` || location.pathname === `/channel/${ch.id}` || location.pathname === `/channel/${ch.owner_id}`;
              return (
                <div
                  key={ch.id}
                  className={`sidebar__item ${isChActive ? 'sidebar__item--active' : ''}`}
                  onClick={() => {
                    navigate(`/channel/${ch.handle || ch.owner_id}`);
                    onClose?.();
                  }}
                  style={{ gap: 14 }}
                >
                  <Avatar
                    src={avatar}
                    name={ch.name}
                    userId={ch.owner_id}
                    size={24}
                  />
                  <span className="sidebar__item-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.name}
                  </span>

                </div>
              );
            })}
          </>
        )}
      </nav>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}
