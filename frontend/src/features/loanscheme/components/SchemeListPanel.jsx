export default function SchemeListPanel({ schemes, activeId, onSelect }) {
  return (
    <div className="scheme-list">
      {schemes.length === 0 && <div className="empty-list">No schemes match your filters.</div>}
      {schemes.map((s) => (
        <button
          key={s.id}
          className={`scheme-list-item ${s.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="scheme-list-item-name">{s.name}</span>
          <span className="scheme-list-item-meta">
            {s.category} · {s.status}
          </span>
        </button>
      ))}
    </div>
  );
}
