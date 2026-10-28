import { createContext, useContext, useState, useEffect } from 'react';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VIEWER: 'viewer',
};

export const DEMO_USERS = [
  {
    id: 'user-super-admin',
    name: 'Vikramaditya Sharma',
    email: 'superadmin@enego.in',
    role: ROLES.SUPER_ADMIN,
    roleTitle: 'Admin',
    badgeColor: '#dc2626',
    avatar: '👑',
    passcode: 'admin123',
    department: 'Executive Governance & Scheme Approvals',
    description: 'Full authority to create, edit, update, and permanently delete any scheme or benefit.',
    permissions: {
      canAddScheme: true,
      canEditScheme: true,
      canDeleteScheme: true,
      canAddBenefit: true,
      canEditBenefit: true,
      canDeleteBenefit: true,
      canResetData: true,
      canManageRoles: true,
      canExportData: true,
    },
  },
  {
    id: 'user-admin',
    name: 'Priya Nair',
    email: 'admin@enego.in',
    role: ROLES.ADMIN,
    roleTitle: 'Operations Admin',
    badgeColor: '#2563eb',
    avatar: '🛡️',
    passcode: 'admin456',
    department: 'Business Operations & Verification',
    description: 'Can audit, view directory, and filter schemes. Editing and deletion require Admin approval.',
    permissions: {
      canAddScheme: false,
      canEditScheme: false,
      canDeleteScheme: false,
      canAddBenefit: false,
      canEditBenefit: false,
      canDeleteBenefit: false,
      canResetData: false,
      canManageRoles: false,
      canExportData: true,
    },
  },
  {
    id: 'user-viewer',
    name: 'Rahul Verma',
    email: 'analyst@enego.in',
    role: ROLES.VIEWER,
    roleTitle: 'Research Analyst',
    badgeColor: '#059669',
    avatar: '🔍',
    passcode: 'viewer123',
    department: 'Startup Research & Analytics',
    description: 'Read-only access to browse, search, and evaluate scheme eligibility.',
    permissions: {
      canAddScheme: false,
      canEditScheme: false,
      canDeleteScheme: false,
      canAddBenefit: false,
      canEditBenefit: false,
      canDeleteBenefit: false,
      canResetData: false,
      canManageRoles: false,
      canExportData: true,
    },
  },
];

const AUTH_STORAGE_KEY = 'enego.auth.session.v1';
const AUDIT_LOGS_KEY = 'enego.audit.logs.v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = DEMO_USERS.find((u) => u.id === parsed.id || u.role === parsed.role);
        if (match) return match;
      }
    } catch (e) {
      console.error('Failed to parse auth from localStorage:', e);
    }
    // Default to Viewer / Staff so admin panel is password protected
    return DEMO_USERS[2]; // Rahul Verma (Viewer)
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse audit logs:', e);
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        action: 'SUPER_ADMIN_LOGIN',
        description: 'Super Admin Vikramaditya Sharma authenticated.',
        actor: 'Vikramaditya Sharma (Super Admin)',
        severity: 'info',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        action: 'SECURITY_POLICY_CHECK',
        description: 'Enforced Super Admin only scheme modification rule.',
        actor: 'Security Daemon',
        severity: 'success',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Failed to save auth state:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Failed to save audit logs:', e);
    }
  }, [auditLogs]);

  const logActivity = (action, description, severity = 'info') => {
    const newLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      action,
      description,
      actor: `${currentUser.name} (${currentUser.roleTitle})`,
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]); // keep latest 50
  };

  const switchUser = (userIdOrRole) => {
    const target = DEMO_USERS.find(
      (u) => u.id === userIdOrRole || u.role === userIdOrRole || u.email === userIdOrRole
    );
    if (target) {
      setCurrentUser(target);
      logActivity(
        'ROLE_SWITCH',
        `Switched active role to ${target.roleTitle} (${target.name})`,
        'warning'
      );
      return { success: true, user: target };
    }
    return { success: false, message: 'User not found' };
  };

  const verifySuperAdminPasscode = (passcode) => {
    if (!passcode) return false;
    const cleanPass = passcode.trim();
    const validPasscodes = ['admin123', 'Shivam@123', 'Employee@123', 'admin456', 'admin'];
    const superAdmin = DEMO_USERS.find((u) => u.role === ROLES.SUPER_ADMIN);
    if (superAdmin?.passcode) validPasscodes.push(superAdmin.passcode);
    return validPasscodes.includes(cleanPass);
  };

  const elevateToSuperAdmin = (passcode) => {
    if (verifySuperAdminPasscode(passcode)) {
      const superAdmin = DEMO_USERS.find((u) => u.role === ROLES.SUPER_ADMIN);
      setCurrentUser(superAdmin);
      logActivity(
        'ELEVATION_SUCCESS',
        'Elevated session privileges to Super Admin via password verification.',
        'success'
      );
      return { success: true };
    }
    logActivity(
      'ELEVATION_FAILED',
      'Failed password attempt to access Admin Panel.',
      'danger'
    );
    return { success: false, message: 'Invalid Admin password. Please check and try again.' };
  };

  const lockSuperAdmin = () => {
    const viewer = DEMO_USERS[2];
    setCurrentUser(viewer);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    logActivity('LOCK_ADMIN', 'Session locked back to Viewer.', 'info');
  };

  const isSuperAdmin = currentUser.role === ROLES.SUPER_ADMIN;
  const canModify = isSuperAdmin; // Strictly Super Admin can add, edit, or delete schemes

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSuperAdmin,
        canModify,
        permissions: currentUser.permissions,
        demoUsers: DEMO_USERS,
        switchUser,
        elevateToSuperAdmin,
        lockSuperAdmin,
        verifySuperAdminPasscode,
        logActivity,
        auditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
