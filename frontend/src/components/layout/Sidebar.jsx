import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, ShortsIcon, SubscriptionsIcon, YouIcon, ExploreIcon } from '../common/Icons';

const mainItems = [
  { icon: 'home', label: 'Главная', path: '/' },
  { icon: 'shorts', label: 'Shorts', path: '/shorts' },
  { icon: 'subscriptions', label: 'Подписки', path: '/subscriptions' },
];

const youItems = [
  { icon: 'you', label: 'Ваши видео', path: '/upload' },
  { icon: 'explore', label: 'В тренде', path: '/trending' },
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

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
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
      </nav>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}
