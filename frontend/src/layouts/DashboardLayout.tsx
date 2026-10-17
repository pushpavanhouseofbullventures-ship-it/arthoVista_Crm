import React, { useState, useEffect, Suspense } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Users, Settings, LogOut, Menu, X,
  Building2, Sun, Moon, UserCheck, Award, Smartphone,
  ShieldCheck, PlusCircle, Sparkles, ChevronLeft, ChevronRight, GitBranch, PhoneCall, Bug
} from 'lucide-react';
import { SuccessToolModal } from '../features/loanscheme/components/SuccessToolModal';
import { ReportIssueModal } from '../features/issues/components/ReportIssueModal';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, user, organizations, activeOrganizationId, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('artha_sidebar_collapsed') === 'true';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('artha_theme') as 'light' | 'dark') || 'light';
  });

  // Verify dark mode class addition
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('artha_theme', theme);
  }, [theme]);

  // If not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but has no organizations, redirect to onboarding wizard
  if (organizations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Active organization details
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (user?.email === 'shivamthakur12012@gmail.com' ? 'Admin' : 'Sale Executive');

  // 5-Level Role Hierarchy:
  // 1. Admin (Super Admin)
  // 2. Manager
  // 3. TL (Team Leader)
  // 4. Finance
  // 5. Operation
  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || user?.email === 'shivamthakur12012@gmail.com';
  const isManager = isAdmin || activeRole === 'Manager';
  const isTeamLeader = isManager || activeRole === 'Team Leader' || activeRole === 'TL';
  const isFinance = activeRole === 'Finance' || activeRole?.toLowerCase().includes('finance');
  const isOperation = ['Operation', 'Operations'].includes(activeRole) || activeRole?.toLowerCase().includes('operat');
  const hasOTAccess = isManager || isFinance || isOperation;
  const isHR =
    ['HR', 'HR Executive', 'HR Caller', 'HR Specialist', 'HR Manager'].includes(activeRole) ||
    activeRole?.toLowerCase().includes('hr');
  const hasHRAccess = isManager || isHR;
  const isPrivileged = isTeamLeader;

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('artha_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav configuration - Unified Lead Management as a clean single nav item
  const navigationItems = [
    {
      name: null,
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all', badge: null }
      ]
    },
    {
      name: null,
      items: [
        { name: 'Lead Management', path: '/crm/leads', icon: Users, role: 'all', badge: null },
        { name: 'Mobile SIM Sync', path: '/crm/mobile-sync', icon: Smartphone, role: 'all', badge: 'Live' }
      ]
    },
    {
      name: null,
      items: [
        { name: 'Quotations', path: '/accounting/quotations', icon: Award, role: 'all', badge: null },
        { name: 'OT Pipeline', path: '/crm/ot-pipeline', icon: GitBranch, role: 'ot', badge: null },
        { name: 'Invoices & Billing', path: '/accounting/invoices', icon: Building2, role: 'all', badge: null },
        { name: 'Issue Reports', path: '/crm/issues', icon: Bug, role: 'all', badge: 'Live' }
      ]
    },
    {
      name: null,
      items: [
        { name: 'HR Calling', path: '/hr', icon: PhoneCall, role: 'hr', badge: 'Live' }
      ]
    },
    {
      name: null,
      items: [
        { name: 'Lead Assignment', path: '/admin/assignment', icon: UserCheck, role: 'teamlead', badge: null },
        { name: 'Integration Hub', path: '/admin/integrations', role: 'admin', icon: ShieldCheck, badge: null },
        { name: 'System Settings', path: '/settings', icon: Settings, role: 'admin', badge: null }
      ]
    }
  ];

  // Helper to filter nav items based on hierarchy
  const hasAccess = (requiredRole?: string) => {
    if (!requiredRole || requiredRole === 'all') return true;
    if (requiredRole === 'ot') return hasOTAccess;
    if (requiredRole === 'hr') return hasHRAccess;
    if (requiredRole === 'admin') return isAdmin;
    if (requiredRole === 'manager') return isManager;
    if (requiredRole === 'teamlead') return isTeamLeader;
    return false;
  };

  const isRouteActive = (itemPath: string) => {
    if (itemPath === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (itemPath === '/crm/issues') {
      return location.pathname === '/crm/issues' || location.pathname === '/issues';
    }
    if (itemPath === '/crm/leads') {
      return (
        location.pathname === '/crm/leads' ||
        location.pathname.startsWith('/crm/leads/') ||
        location.pathname === '/crm/today-leads' ||
        location.pathname === '/crm/today-assigned-leads' ||
        location.pathname === '/crm/open-leads' ||
        location.pathname === '/crm/followups' ||
        location.pathname === '/crm/follow-up' ||
        location.pathname === '/crm/converted-leads' ||
        location.pathname === '/crm/lost-leads' ||
        location.pathname === '/crm/bulk-upload'
      );
    }
    return location.pathname === itemPath || location.pathname.startsWith(itemPath);
  };

  const renderNavSection = (section: any, sIdx: number, isCollapsed = false) => {
    const visibleSubItems = section.items.filter((sub: any) => hasAccess(sub.role));
    if (visibleSubItems.length === 0) return null;

    return (
      <div key={sIdx} className="space-y-1">
        {!isCollapsed && section.name ? (
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {section.name}
            </span>
          </div>
        ) : sIdx > 0 ? (
          <div className="pt-2 pb-1">
            <div className={`border-t border-slate-200 dark:border-dark-800 ${isCollapsed ? 'mx-1' : 'mx-2'}`}></div>
          </div>
        ) : null}
        <div className="space-y-1">
          {visibleSubItems.map((sub: any, idx: number) => {
            const Icon = sub.icon;
            const isItemActive = isRouteActive(sub.path);

            if (isCollapsed) {
              return (
                <Link
                  key={idx}
                  to={sub.path}
                  onClick={() => setMobileOpen(false)}
                  title={sub.name}
                  className={`group flex items-center justify-center p-2.5 my-1 relative rounded-xl text-xs font-bold transition-all ${isItemActive
                    ? 'btn-blue-45 text-white shadow-md shadow-blue-500/25 font-extrabold'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-dark-800'
                    }`}
                >
                  {isItemActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-[#fe7c02] via-[#0062d1] to-[#028825] rounded-r shadow-sm" />
                  )}
                  <div className={`p-1 rounded-lg transition-colors ${isItemActive
                    ? 'text-white'
                    : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-white'
                    }`}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  </div>

                  {sub.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-dark-900" />
                  )}
                </Link>
              );
            }

            return (
              <Link
                key={idx}
                to={sub.path}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center justify-between rounded-xl text-xs font-bold transition-all px-3 py-2 overflow-hidden ${isItemActive
                  ? 'btn-blue-45 text-white shadow-md shadow-blue-500/25 font-extrabold'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-dark-800'
                  }`}
              >
                {isItemActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-[#fe7c02] via-[#0062d1] to-[#028825] rounded-r shadow-sm" />
                )}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-1 rounded-lg transition-colors ${isItemActive
                    ? 'text-white'
                    : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-white'
                    }`}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  </div>
                  <span className="truncate">{sub.name}</span>
                </div>

                {/* Badges */}
                {sub.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${sub.badge === 'Live'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                    {sub.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50/70 dark:bg-dark-950 font-sans antialiased">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div
          className={`flex flex-col border-r border-slate-300 dark:border-dark-800 bg-white dark:bg-dark-900 shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-[width] duration-200 ease-in-out relative ${sidebarCollapsed ? 'w-20' : 'w-64'
            }`}
        >
          {/* Logo Brand Header */}
          <div className={`flex items-center h-16 border-b border-slate-200 dark:border-dark-800 ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
            <Link to="/dashboard" className="flex items-center space-x-3 group min-w-0" title={sidebarCollapsed ? 'Artho Vista CRM' : undefined}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] p-0.5 shadow-sm group-hover:shadow-md transition flex-shrink-0">
                <div className="w-full h-full bg-white dark:bg-dark-900 rounded-[10px] flex items-center justify-center p-1">
                  <img src="/logo.png" alt="Artho Vista Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-sm text-slate-950 dark:text-white tracking-tight leading-tight">
                      Artho Vista
                    </span>
                    <span className="text-[9px] font-extrabold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 px-1 py-0.2 rounded border border-orange-300">
                      CRM
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#028825] dark:text-emerald-400 leading-tight truncate">
                    सपनों से समृद्धि तक
                  </span>
                </div>
              )}
            </Link>

            {/* Expand / Shrink Arrow Toggle Button */}
            {!sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition border border-slate-200 dark:border-dark-700 shadow-sm"
                title="Shrink sidebar"
                aria-label="Shrink sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Floating Expand Arrow when Collapsed */}
          {sidebarCollapsed && (
            <div className="pt-2 px-2 flex justify-center">
              <button
                onClick={toggleSidebar}
                className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-dark-700 transition flex items-center justify-center border border-slate-200 dark:border-dark-700 shadow-sm"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={`flex-1 flex flex-col overflow-y-auto py-3 space-y-3 ${sidebarCollapsed ? 'px-2' : 'px-3.5'}`}>
            {/* Active Workspace / Org Card */}
            {!sidebarCollapsed ? (
              <div className="p-2.5 rounded-xl border border-slate-300 dark:border-dark-700 flex items-center space-x-2.5 transition cursor-default btn-tri-45">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-slate-950 dark:text-slate-100 truncate">
                      {activeOrg?.name || 'Artho Vista CRM'}
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold truncate">
                    Single Organization
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="p-2 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 flex items-center justify-center cursor-default"
                title={`${activeOrg?.name || 'Artho Vista CRM'} (Single Organization)`}
              >
                <Building2 className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              </div>
            )}

            {/* Nav Groups */}
            <nav className="flex-1 space-y-2 ">
              {navigationItems.map((section, idx) => renderNavSection(section, idx, sidebarCollapsed))}
            </nav>
          </div>

          {/* User Profile Footer */}
          <div className={`border-t border-slate-200 dark:border-dark-800 bg-slate-100/70 dark:bg-dark-950/60 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white dark:hover:bg-dark-800 transition border border-transparent hover:border-slate-300 dark:hover:border-dark-700 shadow-none hover:shadow-sm">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] p-0.5 text-white flex items-center justify-center font-black text-xs shadow-sm">
                      <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {(user?.firstName || 'U').charAt(0)}{(user?.lastName || '').charAt(0)}
                      </div>
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-900"></span>
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-black text-slate-950 dark:text-dark-100 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className="inline-block text-[9px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider truncate">
                      {activeRole === 'Admin' || activeRole === 'Super Admin' ? '1. Admin' :
                        activeRole === 'Manager' ? '2. Manager' :
                          activeRole === 'Team Leader' || activeRole === 'TL' ? '3. TL' :
                            activeRole === 'Finance' ? '4. Finance' :
                              activeRole === 'Operation' || activeRole === 'Operations' ? '5. Operation' : 'Sale Executive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2 py-1">
                <div
                  className="relative flex-shrink-0"
                  title={`${user?.firstName} ${user?.lastName} (${activeRole})`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {(user?.firstName || 'U').charAt(0)}{(user?.lastName || '').charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-900"></span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setMobileOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-dark-800 shadow-2xl">
            <div className="absolute top-0 right-0 -mr-12 pt-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-1 flex items-center justify-center h-9 w-9 rounded-full bg-white/20 text-white focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 space-y-3">
              <nav className="flex-1 space-y-2">
                {navigationItems.map((section, idx) => renderNavSection(section, idx))}
              </nav>
            </div>

            <div className="border-t border-slate-100 dark:border-dark-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(user?.firstName || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-dark-200">{user?.firstName}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{activeRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 45-Degree Brand Logo Stripe */}
        <div className="brand-topbar-stripe"></div>

        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between bg-white/95 backdrop-blur-md dark:bg-dark-900/95 border-b border-slate-300 dark:border-dark-800 px-6 z-10 sticky top-0">
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white p-1 focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb / Location Badge & Greeting */}
            <div className="hidden sm:flex items-center space-x-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
                  const name = user?.firstName ? user.firstName.toLowerCase() : 'team';
                  return `${greeting}, ${name}! 🙏`;
                })()}
              </span>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700">
                <Building2 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                <span className="text-slate-400 dark:text-dark-500">&bull;</span>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* Right Header: Search, Actions, Theme Toggle, Profile */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Quick Report Issue Button */}
            <button
              onClick={() => setShowReportIssueModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-orange-500/10 to-rose-500/15 hover:from-rose-500/25 hover:to-orange-500/20 text-rose-900 dark:text-rose-200 border border-rose-300/80 dark:border-rose-700/70 text-xs font-black transition shadow-sm hover:shadow active:scale-95 group"
              title="Report an Issue or Bug"
            >
              <Bug className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 group-hover:rotate-12 transition-transform" />
              <span>Report Issue</span>
            </button>

            {/* Success Tool Button */}
            <button
              onClick={() => setShowSuccessModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/25 text-amber-950 dark:text-amber-200 border border-amber-400/80 dark:border-amber-500/70 text-xs font-black transition shadow-sm hover:shadow active:scale-95 group"
              title="Open Success Tool"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Success Tool</span>
            </button>

            {/* Quick Add Lead Button */}
            {isPrivileged && (
              <Link
                to="/crm/leads"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl btn-tri-45 font-bold text-xs shadow-sm hover:shadow transition active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Lead</span>
              </Link>
            )}
            {isPrivileged && (
              <Link
                to="/crm/bulk-upload"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl btn-tri-45 font-bold text-xs shadow-sm hover:shadow transition active:scale-95"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>BulkUpload</span>
              </Link>
            )
            }

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 transition"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* Dynamic Page Scroll Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-dark-950 p-5 md:p-7">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[40vh] w-full py-12">
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-2 border-[#0062d1]/20"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-[#0062d1] border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-dark-400">Loading view...</p>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Success Tool Modal Dialog with Full LoanScheme Engine */}
      <SuccessToolModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={showReportIssueModal}
        onClose={() => setShowReportIssueModal(false)}
      />
    </div>
  );
};