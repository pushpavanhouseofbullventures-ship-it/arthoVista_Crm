import { useState } from 'react';

export default function SchemeDetail({ scheme, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isBenefitsExpanded, setIsBenefitsExpanded] = useState(true);
  const [isEligibilityExpanded, setIsEligibilityExpanded] = useState(true);

  if (!scheme) {
    return (
      <div className="detail-card">
        <div className="detail-empty-state">
          <p>No scheme selected or found matching your filters.</p>
        </div>
      </div>
    );
  }

  const isActive = scheme.status?.toLowerCase() === 'active';

  // Format type nicely (if string is JSON or array string, or normal text)
  let displayType = scheme.schemeType || '—';
  if (displayType.startsWith('["') && displayType.endsWith('"]')) {
    displayType = "['" + displayType.slice(2, -2) + "']";
  }

  return (
    <div className={`detail-card ${!isExpanded ? 'is-collapsed' : ''}`} id={`scheme-${scheme.id}`}>
      <div 
        className="detail-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        title={isExpanded ? 'Click to shrink / collapse scheme details' : 'Click to expand scheme details'}
      >
        <div className="detail-header-left">
          <h2 className="detail-header-name">{scheme.name}</h2>
          <span className={`status-pill ${isActive ? 'status-active' : 'status-closed'}`}>
            <span className="dot" />
            {scheme.status || 'Active'}
          </span>
          <span className="category-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            {scheme.category}
          </span>
        </div>

        <div className="detail-header-right">
          {!isExpanded && scheme.amount && (
            <span className="collapsed-amount-pill">{scheme.amount}</span>
          )}
          <button
            type="button"
            className="expand-arrow-btn"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Shrink section' : 'Expand section'}
            title={isExpanded ? 'Click to shrink / collapse' : 'Click to expand'}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="detail-body">
          {/* Top Two Columns */}
          <div className="detail-col">
            <div className="field-group">
              <div className="field-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
                </svg>
                <span>Organization</span>
              </div>
              <div className="field-value">{scheme.organization || '—'}</div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <circle cx="7" cy="7" r="1" fill="#ef4444" />
                </svg>
                <span>Type</span>
              </div>
              <div className="field-value">{displayType}</div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Applicable For</span>
              </div>
              <div className="field-value">{scheme.applicableFor || 'Pan India'}</div>
            </div>

            {scheme.companyTypes && scheme.companyTypes.length > 0 && (
              <div className="field-group">
                <div className="field-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 7h3v10H7zM14 7h3v10h-3z" />
                  </svg>
                  <span>Company Types</span>
                </div>
                <div className="tags-container">
                  {scheme.companyTypes.map((c, i) => (
                    <span key={i} className="type-chip">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="detail-col">
            <div className="field-group">
              <div className="field-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Last Date</span>
              </div>
              <div className="field-value">{scheme.lastDate || 'Rolling basis'}</div>
            </div>

            <div className="field-group">
              <div className="field-label">
                <span className="dollar-symbol">$</span>
                <span>Amount</span>
              </div>
              <div className="field-value amount-text">{scheme.amount || '—'}</div>
            </div>

            <div className="field-group portal-btn-container">
              {scheme.portalLink ? (
                <a
                  className="portal-link-button"
                  href={scheme.portalLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Portal Link</span>
                </a>
              ) : (
                <button
                  className="portal-link-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Portal Link for ${scheme.name} is available on official government portal.`);
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Portal Link</span>
                </button>
              )}
            </div>
          </div>

          {/* Lower Two Columns */}
          <div className="detail-col">
            <div className="section-block">
              <div 
                className="section-label-red section-label-clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBenefitsExpanded(!isBenefitsExpanded);
                }}
                title={isBenefitsExpanded ? 'Click to shrink benefits' : 'Click to expand benefits'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                  <span>Benefits</span>
                </div>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`section-mini-chevron ${isBenefitsExpanded ? 'rotated' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {isBenefitsExpanded && (
                <ul className="clean-bullet-list">
                  {(scheme.benefits || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="detail-col">
            <div className="section-block">
              <div 
                className="section-label-red section-label-clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEligibilityExpanded(!isEligibilityExpanded);
                }}
                title={isEligibilityExpanded ? 'Click to shrink eligibility' : 'Click to expand eligibility'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>Eligibility</span>
                </div>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`section-mini-chevron ${isEligibilityExpanded ? 'rotated' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {isEligibilityExpanded && (
                <>
                  <div className="clean-numbered-list">
                    {(scheme.eligibility || []).map((e, i) => (
                      <div key={i} className="eligibility-item">
                        {e.startsWith(`${i + 1}.`) ? e : `${i + 1}. ${e}`}
                      </div>
                    ))}
                  </div>

                  {scheme.focusSectors && scheme.focusSectors.length > 0 && (
                    <div className="focus-sectors-subblock">
                      <div className="focus-sectors-heading">Focus Sectors</div>
                      <ul className="clean-bullet-list">
                        {scheme.focusSectors.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

