import { useMemo, useRef, useState, useEffect } from 'react';

function useOutsideClick(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

function MultiSelectDropdown({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(() => setOpen(false));

  return (
    <div className="filter-dropdown-wrapper" ref={ref}>
      <button
        type="button"
        className={`filter-btn ${selected.length > 0 ? 'has-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter-funnel-icon">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>{label}</span>
        {selected.length > 0 && <span className="filter-active-count">({selected.length})</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`arrow-icon ${open ? 'rotated' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="filter-popover">
          <div className="filter-popover-header">
            <span>Filter by {label}</span>
            {selected.length > 0 && (
              <button className="clear-btn" onClick={onClear}>
                Reset
              </button>
            )}
          </div>
          <div className="filter-popover-list">
            {options.length === 0 && <div className="no-options">No options available</div>}
            {options.map((opt) => (
              <label key={opt} className="filter-option-item">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                />
                <span className="option-text">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchemeFilters({
  schemes,
  search,
  onSearchChange,
  sectorFilter,
  onSectorToggle,
  onSectorClear,
  companyTypeFilter,
  onCompanyTypeToggle,
  onCompanyTypeClear,
}) {
  const allSectors = useMemo(() => {
    const set = new Set();
    schemes.forEach((s) => (s.focusSectors || []).forEach((f) => set.add(f)));
    return Array.from(set).sort();
  }, [schemes]);

  const allCompanyTypes = useMemo(() => {
    const set = new Set();
    schemes.forEach((s) => (s.companyTypes || []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [schemes]);

  return (
    <div className="controls-row">
      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search grants by name, or"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button className="search-clear-btn" onClick={() => onSearchChange('')} title="Clear search">
            ✕
          </button>
        )}
      </div>

      <div className="filters-right-group">
        <MultiSelectDropdown
          label="Sectors"
          options={allSectors}
          selected={sectorFilter}
          onToggle={onSectorToggle}
          onClear={onSectorClear}
        />
        <MultiSelectDropdown
          label="Company Type"
          options={allCompanyTypes}
          selected={companyTypeFilter}
          onToggle={onCompanyTypeToggle}
          onClear={onCompanyTypeClear}
        />
      </div>
    </div>
  );
}
