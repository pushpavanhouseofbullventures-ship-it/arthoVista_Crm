export default function SchemePreviewModal({ scheme, isOpen, onClose, onEdit, isSuperAdmin }) {
  if (!isOpen || !scheme) return null;

  const isActive = scheme.status?.toLowerCase() === 'active';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content scheme-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="scheme-preview-header-meta">
            <span className={`status-pill ${isActive ? 'status-active' : 'status-closed'}`}>
              <span className="dot" />
              {scheme.status || 'Active'}
            </span>
            <span className="category-pill">{scheme.category}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body scheme-preview-body">
          <h2 className="preview-title">{scheme.name}</h2>
          <div className="preview-org">{scheme.organization || 'Government of India'}</div>

          <div className="preview-grid-2">
            <div className="preview-stat-card">
              <span className="stat-card-label">Funding / Amount</span>
              <span className="stat-card-val amount-highlight">{scheme.amount || 'As per norms'}</span>
            </div>
            <div className="preview-stat-card">
              <span className="stat-card-label">Deadline / Last Date</span>
              <span className="stat-card-val">{scheme.lastDate || 'Rolling basis'}</span>
            </div>
            <div className="preview-stat-card">
              <span className="stat-card-label">Applicability</span>
              <span className="stat-card-val">{scheme.applicableFor || 'Pan India'}</span>
            </div>
            <div className="preview-stat-card">
              <span className="stat-card-label">Scheme Type</span>
              <span className="stat-card-val">{scheme.schemeType || 'Grant / Scheme'}</span>
            </div>
          </div>

          {scheme.portalLink && (
            <div className="preview-link-banner">
              <span>Official Application Portal:</span>
              <a href={scheme.portalLink} target="_blank" rel="noopener noreferrer" className="external-link-btn">
                Visit Portal ↗
              </a>
            </div>
          )}

          {scheme.benefits && scheme.benefits.length > 0 && (
            <div className="preview-section">
              <h4 className="preview-section-title">🎁 Key Benefits & Subsidies</h4>
              <ul className="preview-bullets-list">
                {scheme.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {scheme.eligibility && scheme.eligibility.length > 0 && (
            <div className="preview-section">
              <h4 className="preview-section-title">🛡️ Eligibility & Qualification Criteria</h4>
              <ul className="preview-bullets-list">
                {scheme.eligibility.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {scheme.focusSectors && scheme.focusSectors.length > 0 && (
            <div className="preview-section">
              <h4 className="preview-section-title">🎯 Focus Sectors</h4>
              <div className="preview-tags-row">
                {scheme.focusSectors.map((s, i) => (
                  <span key={i} className="sector-tag">{s}</span>
                ))}
              </div>
            </div>
          )}

          {scheme.companyTypes && scheme.companyTypes.length > 0 && (
            <div className="preview-section">
              <h4 className="preview-section-title">🏢 Eligible Company Entities</h4>
              <div className="preview-tags-row">
                {scheme.companyTypes.map((c, i) => (
                  <span key={i} className="company-tag">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer preview-modal-footer">
          <button type="button" className="pill-btn outline" onClick={onClose}>
            Close
          </button>
          {isSuperAdmin && onEdit && (
            <button
              type="button"
              className="pill-btn btn-funding"
              onClick={() => {
                onClose();
                onEdit(scheme);
              }}
            >
              ✏️ Edit This Scheme
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
