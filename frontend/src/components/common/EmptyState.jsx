export function EmptyState({ icon = '🎬', text = 'Ничего не найдено' }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__text">{text}</div>
    </div>
  );
}
