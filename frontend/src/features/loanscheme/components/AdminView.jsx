import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import SchemeForm from '../components/SchemeForm.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { CATEGORIES } from '../data/seedSchemes';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAuthStore } from '../../../store/authStore';

export default function Admin({
  schemes = [],
  addScheme,
  updateScheme,
  deleteScheme,
  onExitAdmin,
}) {
  const { isSuperAdmin, elevateToSuperAdmin } = useAuth();
  const { addToast } = useToast();
  const { user, organizations, activeOrganizationId } = useAuthStore();

  const activeOrg = organizations.find((org) => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (user?.email === 'shivamthakur12012@gmail.com' ? 'Admin' : 'Sale Executive');
  const isCrmAdmin = ['Admin', 'Super Admin'].includes(activeRole) || user?.email === 'shivamthakur12012@gmail.com';

  const hasFullAdminAccess = isCrmAdmin || isSuperAdmin;

  // Search & Filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Editing & Creating
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Passcode modal for extra safety if needed
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  // Confirmation Modal
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const editingScheme = schemes.find((s) => s.id === editingId) || null;

  // Check if Admin; if not, show prompt
  const ensureAdmin = (actionLabel = 'perform this action') => {
    if (!hasFullAdminAccess) {
      setPassError('');
      setPasscode('');
      setShowPasscodeModal(true);
      return false;
    }
    return true;
  };

  const handleStartCreate = () => {
    if (!ensureAdmin('add a scheme')) return;
    setEditingId(null);
    setIsCreating(true);
  };

  const handleStartEdit = (scheme) => {
    if (!ensureAdmin('edit schemes')) return;
    setIsCreating(false);
    setEditingId(scheme.id);
  };

  const handleSave = (payload) => {
    if (!ensureAdmin('save schemes')) return;

    if (editingScheme) {
      updateScheme(editingScheme.id, payload);
      addToast(`Scheme "${payload.name}" updated successfully!`, 'success');
      setEditingId(null);
    } else {
      addScheme(payload);
      addToast(`Scheme "${payload.name}" added successfully!`, 'success');
      setIsCreating(false);
    }
  };

  const handleDelete = (scheme) => {
    if (!ensureAdmin('delete schemes')) return;

    setConfirmState({
      isOpen: true,
      title: `Delete "${scheme.name}"?`,
      message: 'Are you sure you want to delete this scheme? This cannot be undone.',
      onConfirm: () => {
        deleteScheme(scheme.id);
        addToast(`Scheme "${scheme.name}" deleted.`, 'warning');
        if (editingId === scheme.id) setEditingId(null);
        setConfirmState({ isOpen: false });
      },
    });
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    const res = elevateToSuperAdmin(passcode.trim());
    if (res.success) {
      addToast('Admin access unlocked!', 'success');
      setShowPasscodeModal(false);
      setPasscode('');
    } else {
      setPassError('Incorrect password. Default is admin123');
    }
  };

  // Guard: strictly CRM Admin only
  if (!isCrmAdmin) {
    return (
      <div className="simple-admin-page" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 460, margin: '60px auto', background: '#fff', padding: '36px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>CRM Admin Access Required</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
            The Success Tool Admin Panel is strictly reserved for CRM Administrators.
          </p>
          <button onClick={onExitAdmin} className="pill-btn btn-funding" style={{ padding: '10px 24px' }}>
            ← Return to Scheme Catalog
          </button>
        </div>
      </div>
    );
  }

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      if (category !== 'ALL' && s.category !== category) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const text = `${s.name} ${s.organization || ''} ${s.category || ''} ${s.amount || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [schemes, category, search]);

  const totalPages = Math.ceil(filteredSchemes.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSchemes.slice(start, start + pageSize);
  }, [filteredSchemes, page, pageSize]);

  return (
    <div className="simple-admin-page">
      {/* Simple Clean Top Header */}
      <header className="simple-admin-header">
        <div>
          <h1 className="simple-admin-title">Admin Panel</h1>
          <p className="simple-admin-sub">Manage government loan schemes, grants, and subsidies.</p>
        </div>

        <div className="simple-admin-actions">
          <button
            className="pill-btn btn-funding"
            onClick={handleStartCreate}
          >
            + Add Scheme
          </button>

          {onExitAdmin ? (
            <button onClick={onExitAdmin} className="pill-btn outline sm admin-switch-corner-btn">
              ← Exit Admin
            </button>
          ) : (
            <NavLink to="/" className="pill-btn outline sm admin-switch-corner-btn">
              ← Exit Admin
            </NavLink>
          )}
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="simple-admin-body">
        {/* Editor Form if Adding or Editing */}
        {(isCreating || editingScheme) && (
          <div className="simple-form-wrapper">
            <SchemeForm
              key={editingId || 'new'}
              editingScheme={editingScheme}
              onSave={handleSave}
              onCancel={() => {
                setEditingId(null);
                setIsCreating(false);
              }}
              isSuperAdmin={hasFullAdminAccess}
            />
          </div>
        )}

        {/* Filter / Search Bar */}
        <div className="simple-filter-bar">
          <div className="simple-search-box">
            <input
              type="text"
              placeholder="Search schemes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="form-input simple-cat-select"
          >
            <option value="ALL">All Categories ({schemes.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Simple Schemes Table */}
        <div className="simple-table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Scheme Name</th>
                <th style={{ width: '18%' }}>Category</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '18%' }}>Amount</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No schemes found matching your search.
                  </td>
                </tr>
              )}
              {paginated.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="simple-scheme-name">{s.name}</div>
                    <div className="simple-scheme-org">{s.organization || 'Government Department'}</div>
                  </td>
                  <td>
                    <span className="category-pill-table">{s.category}</span>
                  </td>
                  <td>
                    <span className={`status-pill-table ${s.status?.toLowerCase() === 'active' ? 'active' : 'closed'}`}>
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <span className="simple-amount-text">{s.amount || '—'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="simple-row-actions">
                      <button
                        className="pill-btn sm btn-funding"
                        onClick={() => handleStartEdit(s)}
                        title="Edit Scheme"
                      >
                        Edit
                      </button>
                      <button
                        className="pill-btn sm btn-danger-outline"
                        onClick={() => handleDelete(s)}
                        title="Delete Scheme"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination-bar">
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredSchemes.length} schemes)
            </span>
            <div className="pagination-buttons">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    className={`page-num-btn ${page === p ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simple Passcode Modal */}
      {showPasscodeModal && (
        <div className="modal-backdrop" onClick={() => setShowPasscodeModal(false)}>
          <div className="modal-content simple-passcode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👑 Enter Super Admin Passcode</h3>
              <button className="modal-close" onClick={() => setShowPasscodeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px 0' }}>
                Only Super Admins can add, edit, or delete schemes. Enter the Super Admin passcode (<strong>admin123</strong>) to proceed:
              </p>
              <form onSubmit={handlePasscodeSubmit}>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (admin123)..."
                  className="form-input"
                  autoFocus
                />
                {passError && <div className="passcode-error-text" style={{ marginTop: 6 }}>{passError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button type="button" className="pill-btn outline" onClick={() => setShowPasscodeModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="pill-btn btn-danger-gradient">
                    Unlock Super Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ isOpen: false })}
      />
    </div>
  );
}
