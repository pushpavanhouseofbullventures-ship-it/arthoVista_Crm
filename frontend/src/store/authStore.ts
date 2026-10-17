import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  status: 'active' | 'inactive';
}

export interface UserOrganization {
  id: string;
  name: string;
  businessType: 'general' | 'loan' | 'registration' | 'certification' | 'custom';
  logoUrl?: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  organizations: UserOrganization[];
  activeOrganizationId: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  setOrganizations: (orgs: UserOrganization[]) => void;
  setActiveOrganizationId: (orgId: string | null) => void;
  login: (token: string, user: UserProfile, organizations: UserOrganization[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial state from localStorage if available
  const savedUser = localStorage.getItem('artha_user');
  const savedOrgs = localStorage.getItem('artha_organizations');
  const savedActiveOrgId = localStorage.getItem('artha_active_org_id');
  const savedToken = localStorage.getItem('artha_token'); // For convenience in dev, or cookies in prod

  return {
    token: savedToken || null,
    user: savedUser ? JSON.parse(savedUser) : null,
    organizations: savedOrgs ? JSON.parse(savedOrgs) : [],
    activeOrganizationId: savedActiveOrgId || null,
    isAuthenticated: !!savedToken,

    setToken: (token) => {
      if (token) {
        localStorage.setItem('artha_token', token);
      } else {
        localStorage.removeItem('artha_token');
      }
      set({ token, isAuthenticated: !!token });
    },

    setUser: (user) => {
      if (user) {
        localStorage.setItem('artha_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('artha_user');
      }
      set({ user });
    },

    setOrganizations: (organizations) => {
      localStorage.setItem('artha_organizations', JSON.stringify(organizations));
      set({ organizations });
    },

    setActiveOrganizationId: (activeOrganizationId) => {
      if (activeOrganizationId) {
        localStorage.setItem('artha_active_org_id', activeOrganizationId);
      } else {
        localStorage.removeItem('artha_active_org_id');
      }
      set({ activeOrganizationId });
    },

    login: (token, user, organizations) => {
      localStorage.setItem('artha_token', token);
      localStorage.setItem('artha_user', JSON.stringify(user));
      localStorage.setItem('artha_organizations', JSON.stringify(organizations));
      
      const activeOrgId = organizations.length > 0 ? organizations[0].id : null;
      if (activeOrgId) {
        localStorage.setItem('artha_active_org_id', activeOrgId);
      }

      set({
        token,
        user,
        organizations,
        activeOrganizationId: activeOrgId,
        isAuthenticated: true
      });
    },

    logout: () => {
      localStorage.removeItem('artha_token');
      localStorage.removeItem('artha_user');
      localStorage.removeItem('artha_organizations');
      localStorage.removeItem('artha_active_org_id');
      set({
        token: null,
        user: null,
        organizations: [],
        activeOrganizationId: null,
        isAuthenticated: false
      });
    }
  };
});
