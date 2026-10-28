import { useState } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RoleSwitcherModal({ isOpen, onClose }) {
  const { currentUser, demoUsers, switchUser, elevateToSuperAdmin, isSuperAdmin } = useAuth();
  const { addToast } = useToast();
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (user) => {
    switchUser(user.id);
    addToast(`Switched active role to ${user.roleTitle} (${user.name})`, 'info');
    onClose();
  };

  const handleElevateSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    if (!passcode.trim()) {
      setPassError('Please enter the Admin passcode.');
      return;
    }

    const res = elevateToSuperAdmin(passcode.trim());
    if (res.success) {
      addToast('Admin access granted! Full editing & deletion unlocked.', 'success');
      setPasscode('');
      onClose();
    } else {
      setPassError(res.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content role-switcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-text">
            <h3>🔐 Role-Based Access Control (RBAC)</h3>
            <p className="modal-subtitle">
              Test governance rules: only <strong>Admin</strong> can add, edit, or delete schemes.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="current-role-banner">
            <div className="current-role-avatar">{currentUser.avatar}</div>
            <div className="current-role-info">
              <div className="current-role-label">CURRENT ACTIVE SESSION</div>
              <div className="current-role-name">{currentUser.name}</div>
              <div className="current-role-badge-row">
                <span
                  className="role-pill"
                  style={{
                    backgroundColor: currentUser.badgeColor + '20',
                    color: currentUser.badgeColor,
                    borderColor: currentUser.badgeColor,
                  }}
                >
                  {currentUser.roleTitle}
                </span>
                <span className="permission-indicator">
                  {isSuperAdmin ? '🟢 Full CRUD Privileges' : '🔒 Read/Audit Only'}
                </span>
              </div>
            </div>
          </div>

          <div className="role-options-title">Switch Active Profile for Demo / Testing:</div>
          <div className="role-cards-grid">
            {demoUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className={`role-card ${isSelected ? 'selected' : ''} ${u.role === ROLES.SUPER_ADMIN ? 'super-admin-card' : ''}`}
                  onClick={() => handleSelectUser(u)}
                >
                  <div className="role-card-top">
                    <span className="role-card-avatar">{u.avatar}</span>
                    <div className="role-card-titles">
                      <div className="role-card-name">{u.name}</div>
                      <div className="role-card-role" style={{ color: u.badgeColor }}>
                        {u.roleTitle}
                      </div>
                    </div>
                    {isSelected && <span className="active-check-badge">✓ Active</span>}
                  </div>
                  <div className="role-card-desc">{u.description}</div>
                  <div className="role-card-footer">
                    <span className="passcode-hint">Passcode: <code>{u.passcode}</code></span>
                    <button
                      type="button"
                      className={`pill-btn sm ${isSelected ? 'outline' : 'primary'}`}
                    >
                      {isSelected ? 'Current' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!isSuperAdmin && (
            <div className="super-admin-elevation-box">
              <div className="elevation-header">
                <span className="elevation-icon">⚡</span>
                <div>
                  <h4>Quick Admin Passcode Elevation</h4>
                  <p>Enter the Admin master passcode (<code>admin123</code>) to unlock modification rights.</p>
                </div>
              </div>
              <form onSubmit={handleElevateSubmit} className="elevation-form">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (admin123)..."
                  className="form-input"
                  autoFocus
                />
                <button type="submit" className="pill-btn btn-danger-gradient">
                  Unlock Admin
                </button>
              </form>
              {passError && <div className="passcode-error-text">{passError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
