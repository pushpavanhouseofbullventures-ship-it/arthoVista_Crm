import { useState, useMemo } from 'react';
import { loanSchemesColumns, loanComparisonRows } from '../data/seedLoans';

export default function LoanComparisonView() {
  const [search, setSearch] = useState('');

  // Filter schemes (columns) or parameters (rows) based on search
  const visibleColumns = useMemo(() => {
    if (!search.trim()) return loanSchemesColumns;
    const q = search.trim().toLowerCase();

    // Check if column matches name or any row content
    return loanSchemesColumns.filter((col) => {
      if (col.name.toLowerCase().includes(q)) return true;
      return loanComparisonRows.some((row) => {
        const val = row.values[col.id];
        if (Array.isArray(val)) {
          return val.some((v) => v.toLowerCase().includes(q));
        }
        return (val || '').toLowerCase().includes(q);
      });
    });
  }, [search]);

  const visibleRows = useMemo(() => {
    if (!search.trim()) return loanComparisonRows;
    const q = search.trim().toLowerCase();

    return loanComparisonRows.filter((row) => {
      if (row.paramName.toLowerCase().includes(q)) return true;
      return visibleColumns.some((col) => {
        const val = row.values[col.id];
        if (Array.isArray(val)) {
          return val.some((v) => v.toLowerCase().includes(q));
        }
        return (val || '').toLowerCase().includes(q);
      });
    });
  }, [search, visibleColumns]);

  const handleExportExcel = () => {
    const headers = ['SCHEME Parameter', ...visibleColumns.map((c) => c.name)];
    const rows = visibleRows.map((row) => {
      const rowValues = visibleColumns.map((col) => {
        const val = row.values[col.id];
        if (Array.isArray(val)) {
          return `"${val.join('; ').replace(/"/g, '""')}"`;
        }
        return `"${(val || '-').replace(/"/g, '""')}"`;
      });
      return [`"${row.paramName.replace(/"/g, '""')}"`, ...rowValues];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Enego_Loan_Schemes_Comparison_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="loan-comparison-container">
      <div className="loan-title-header">
        <h2 className="loan-main-title">Loan Schemes Comparison</h2>
      </div>

      <div className="loan-toolbar">
        <div className="loan-search-wrapper">
          <svg
            className="loan-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="loan-search-input"
            placeholder="Search schemes by name, eligibility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="loan-search-clear" onClick={() => setSearch('')} title="Clear search">
              ✕
            </button>
          )}
        </div>

        <button className="btn-export-excel" onClick={handleExportExcel}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export as Excel</span>
        </button>
      </div>

      <div className="loan-table-card">
        <div className="loan-table-scroll-wrapper">
          <table className="loan-matrix-table">
            <thead>
              <tr>
                <th className="th-param-col">SCHEME</th>
                {visibleColumns.map((col) => (
                  <th key={col.id} className="th-scheme-col">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 || visibleColumns.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="loan-empty-cell">
                    <div className="empty-message">No matching schemes or criteria found for "{search}"</div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.paramId}
                    className={`loan-row ${row.highlight ? 'row-highlight' : ''} ${row.isMutedRow ? 'row-muted' : ''
                      }`}
                  >
                    <td className="td-param-col">
                      <span className="param-text">{row.paramName}</span>
                      {row.hasInfo && (
                        <span className="info-icon-badge" title={`Details on ${row.paramName}`}>
                          ⓘ
                        </span>
                      )}
                    </td>
                    {visibleColumns.map((col) => {
                      const val = row.values[col.id];
                      return (
                        <td key={col.id} className="td-val-col">
                          {Array.isArray(val) ? (
                            <ul className="doc-bullet-list">
                              {val.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="cell-val-text">{val || '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="loan-footer-note">
        <p>© 2026 ArthoVista Success Toolkit. All rights reserved.</p>
      </footer>
    </div>
  );
}
