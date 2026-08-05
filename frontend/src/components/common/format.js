export function formatDuration(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatViews(count) {
  if (count == null) return '';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1).replace('.0', '')} млрд просмотров`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace('.0', '')} млн просмотров`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(1).replace('.0', '')} тыс. просмотров`;
  return `${count} просмотров`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн. назад`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} мес. назад`;
  return `${Math.floor(diff / 31536000)} г. назад`;
}

export function formatCount(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')} тыс.`;
  return String(n);
}
