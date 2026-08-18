import { useState, useEffect } from 'react';

const COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#ff5722', '#795548'];

function getAvatarColor(id) {
  if (!id) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ src, name, userId, size = 36, style = {}, onClick, className = '' }) {
  const [imgError, setImgError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const showImg = src && !imgError;
  const initial = (name?.[0] || String(userId || 'U')[0] || 'U').toUpperCase();

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: getAvatarColor(userId || name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(size * 0.42)),
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'inherit',
        userSelect: 'none',
        ...style,
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
