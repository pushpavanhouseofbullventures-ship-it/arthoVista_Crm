import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthStore } from '../../../store/authStore';

export default function TopBar({
  title = 'Dashboard',
  subtitle = 'ArthoVista Success Toolkit',
  isAdminView = false,
  onToggleAdmin,
  onCloseModal
}) {
  const [modalType, setModalType] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const { isSuperAdmin, elevateToSuperAdmin } = useAuth();
  const { user, organizations, activeOrganizationId } = useAuthStore();

  // Check if current CRM user is Admin or Super Admin
  const activeOrg = organizations.find((org) => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (user?.email === 'shivamthakur12012@gmail.com' ? 'Admin' : 'Sale Executive');
  const isCrmAdmin = ['Admin', 'Super Admin'].includes(activeRole) || user?.email === 'shivamthakur12012@gmail.com';

  const handleAdminButtonClick = () => {
    if (isAdminView) {
      if (onToggleAdmin) onToggleAdmin(false);
      return;
    }

    if (!isCrmAdmin) {
      return;
    }

    if (isSuperAdmin) {
      // Already authenticated
      if (onToggleAdmin) onToggleAdmin(true);
    } else {
      // Prompt password verification
      setPasswordError('');
      setAdminPassword('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!adminPassword.trim()) {
      setPasswordError('Please enter the Admin password.');
      return;
    }

    const res = elevateToSuperAdmin(adminPassword.trim());
    if (res.success) {
      setShowPasswordModal(false);
      setAdminPassword('');
      if (onToggleAdmin) onToggleAdmin(true);
    } else {
      setPasswordError(res.message || 'Incorrect Admin password. Please check and try again.');
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="topbar-title">{title}</h1>
          <p className="topbar-subtitle">{subtitle}</p>
        </div>

        <div className="topbar-actions">
          <button className="pill-btn btn-funding" onClick={() => setModalType('funding')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Funding</span>
          </button>

          <button className="pill-btn btn-tax" onClick={() => setModalType('tax')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
            </svg>
            <span>Tax Calculator</span>
          </button>

          <button className="pill-btn btn-eligibility" onClick={() => setModalType('eligibility')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Eligibility</span>
            <span className="badge-dot" />
          </button>

          {/* Single Admin Panel Button - Visible ONLY to CRM Admin */}
          {isCrmAdmin && (
            isAdminView ? (
              <button
                onClick={() => onToggleAdmin && onToggleAdmin(false)}
                className="pill-btn outline admin-switch-corner-btn"
                title="Return to scheme catalog"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Exit Admin</span>
              </button>
            ) : (
              <button
                onClick={handleAdminButtonClick}
                className={`pill-btn ${isSuperAdmin ? 'btn-admin-switch-corner' : 'outline'}`}
                title="Protected: Enter Admin Password to Access"
              >
                <span>{isSuperAdmin ? '👑 Admin Panel' : '🔒 Admin Panel'}</span>
              </button>
            )
          )}

          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="pill-btn outline modal-close-corner-btn"
              title="Close Toolkit Modal"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Admin Password Verification Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content simple-passcode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔐</span>
                <span>Admin Panel Access</span>
              </h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Access to the <strong>Admin Panel</strong> is restricted. Please enter the master password to manage funding schemes, grants, and subsidies:
              </p>
              <form onSubmit={handlePasswordSubmit}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Admin Password..."
                    className="form-input"
                    style={{ width: '100%', paddingRight: 40 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? '👁️' : '🔒'}
                  </button>
                </div>

                {passwordError && (
                  <div className="passcode-error-text" style={{ margin: '6px 0 14px 0', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                    ⚠️ {passwordError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    className="pill-btn outline"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="pill-btn btn-funding"
                  >
                    Unlock & Enter Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Feature Modals */}
      {modalType && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'funding' && '🚀 Funding Opportunities Guide'}
                {modalType === 'tax' && '📊 Startup Tax & Subsidies Calculator'}
                {modalType === 'eligibility' && '🛡️ Fast Eligibility Checker'}
              </h3>
              <button className="modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className="modal-body">
              {modalType === 'funding' && (
                <div>
                  <p>Discover government grants, equity rounds, and seed funds tailored to your startup's stage:</p>
                  <ul className="modal-list">
                    <li><strong>Idea & Prototype:</strong> TIDE 2.0, NIDHI PRAYAS, IVP Voucher A up to ₹10 Lakhs.</li>
                    <li><strong>Early Revenue & Growth:</strong> BIRAC BIG, Startup India Seed Fund up to ₹50 Lakhs.</li>
                    <li><strong>Scale & Expansion:</strong> CGTMSE Collateral-Free Loans, MSME Credit Guarantee.</li>
                  </ul>
                </div>
              )}
              {modalType === 'tax' && (
                <div>
                  <p>Quick tax benefit estimation for DPIIT-recognized startups under Section 80-IAC:</p>
                  <div className="tax-calc-box">
                    <div>100% Tax Holiday for 3 consecutive financial years.</div>
                    <div style={{ marginTop: 8, color: '#16a34a', fontWeight: 600 }}>Zero Angel Tax under Section 56(2)(viib).</div>
                  </div>
                </div>
              )}
              {modalType === 'eligibility' && (
                <div>
                  <p>Select your criteria to see immediate matching schemes:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    <label><input type="checkbox" defaultChecked /> Startup registered &lt; 7 years</label>
                    <label><input type="checkbox" defaultChecked /> Pvt Ltd, LLP, or Registered Partnership</label>
                    <label><input type="checkbox" defaultChecked /> Working prototype or ready-to-market solution</label>
                  </div>
                  <p style={{ marginTop: 14, color: '#16a34a', fontWeight: 600 }}>✓ Eligible for 48+ Active Grants & Schemes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
