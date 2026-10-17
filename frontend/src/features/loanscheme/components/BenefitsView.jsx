import { useState, useMemo } from 'react';

export default function BenefitsView({ benefits = [] }) {
  const [search, setSearch] = useState('');

  const filteredBenefits = useMemo(() => {
    if (!search.trim()) return benefits;
    const q = search.trim().toLowerCase();
    return benefits.filter((b) => {
      const text = `${b.sr_no} ${b.benefit_description} ${b.category}`.toLowerCase();
      return text.includes(q);
    });
  }, [benefits, search]);

  const handleExportExcel = () => {
    // Generate CSV format compatible with Excel
    const headers = ['Sr. No', 'Benefit Description', 'Category'];
    const rows = filteredBenefits.map((b) => [
      b.sr_no,
      `"${(b.benefit_description || '').replace(/"/g, '""')}"`,
      `"${(b.category || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Enego_Benefits_and_Schemes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="benefits-page-container">
      <div className="benefits-title-header">
        <h2 className="benefits-main-title">Benefits & Schemes</h2>
      </div>

      <div className="benefits-toolbar">
        <div className="benefits-search-wrapper">
          <svg
            className="benefits-search-icon"
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
            className="benefits-search-input"
            placeholder="Search benefits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="benefits-search-clear" onClick={() => setSearch('')} title="Clear search">
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

      <div className="benefits-table-wrapper">
        <table className="benefits-data-table">
          <thead>
            <tr>
              <th className="th-srno">Sr. No</th>
              <th className="th-desc">Benefit Description</th>
              <th className="th-category">Category</th>
            </tr>
          </thead>
          <tbody>
            {filteredBenefits.length === 0 ? (
              <tr>
                <td colSpan="3" className="benefits-empty-cell">
                  <div className="empty-message">No matching benefits found for "{search}"</div>
                </td>
              </tr>
            ) : (
              filteredBenefits.map((item) => (
                <tr key={item.sr_no} className="benefits-table-row">
                  <td className="td-srno">{item.sr_no}</td>
                  <td className="td-desc">{item.benefit_description}</td>
                  <td className="td-category">{item.category}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
