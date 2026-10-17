import { CATEGORIES, RESOURCE_LINKS } from '../data/seedSchemes';

function getIcon(name) {
  switch (name) {
    case 'ALL SCHEMES':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'GRANT':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'GRANT DEBT EQUITY':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case 'DEBT EQUITY':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="21" x2="21" y2="21" />
          <line x1="6" y1="18" x2="6" y2="10" />
          <line x1="10" y1="18" x2="10" y2="10" />
          <line x1="14" y1="18" x2="14" y2="10" />
          <line x1="18" y1="18" x2="18" y2="10" />
          <polygon points="12 3 2 8 22 8 12 3" />
        </svg>
      );
    case 'EQUITY':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-5 0c0 2 5 2 5 4.5a3.5 3.5 0 0 1-5 0" />
        </svg>
      );
    case 'LOAN ONLY':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'LOAN SUBSIDY':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <circle cx="9.5" cy="9.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'CERTGEM':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'LOAN':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'BENEFITS':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case 'START UP':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case 'TAX':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'SEED FUND':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22v-8" />
          <path d="M12 14c-4 0-7-3-7-7 4 0 7 3 7 7z" />
          <path d="M12 14c4 0 7-3 7-7-4 0-7 3-7 7z" />
        </svg>
      );
    case 'PVT LTD':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h3v10H7z" />
          <path d="M14 7h3v10h-3z" />
        </svg>
      );
    case 'LLP':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'DIGITAL MARKETING':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    default:
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export default function Sidebar({ schemes = [], benefits = [], activeCategory, onSelectCategory }) {
  const countFor = (category) =>
    category === 'ALL SCHEMES' ? schemes.length : schemes.filter((s) => s.category === category).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand btn-tri-45">
        <div className="sidebar-brand-logo">
          ArthoVista
        </div>
        <div className="sidebar-brand-tagline">सपनों से समृद्धि तक</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">PRODUCTS</div>

        <button
          className={`sidebar-item ${activeCategory === 'ALL SCHEMES' ? 'active' : ''}`}
          onClick={() => onSelectCategory('ALL SCHEMES')}
        >
          <div className="sidebar-item-left">
            <span className="sidebar-icon">{getIcon('ALL SCHEMES')}</span>
            <span className="sidebar-item-text">ALL SCHEMES</span>
          </div>
          <span className="count">{countFor('ALL SCHEMES')}</span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`sidebar-item ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat)}
          >
            <div className="sidebar-item-left">
              <span className="sidebar-icon">{getIcon(cat)}</span>
              <span className="sidebar-item-text">{cat}</span>
            </div>
            <span className="count">{countFor(cat)}</span>
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>
          RESOURCES & SERVICES
        </div>

        {RESOURCE_LINKS.map((label) => (
          <button
            key={label}
            className={`sidebar-item ${activeCategory === label ? 'active' : ''}`}
            onClick={() => onSelectCategory(label)}
          >
            <div className="sidebar-item-left">
              <span className="sidebar-icon">{getIcon(label)}</span>
              <span className="sidebar-item-text">{label}</span>
            </div>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-content">
          <span className="footer-dot" />
          <span className="footer-title">ArthoVista Success Toolkit v1.0</span>
        </div>
        <span className="footer-total">Total: {schemes.length}</span>
      </div>
    </aside>
  );
}
