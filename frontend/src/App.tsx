import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Direct Core CRM Imports (Instant SPA navigation without chunk loading flash or unmounting)
import { Dashboard } from './pages/Dashboard';
import { LeadsList } from './pages/crm/LeadsList';
import { LeadDetail } from './pages/crm/LeadDetail';
import { BulkUpload } from './pages/crm/BulkUpload';
import { FollowUpPlanner } from './pages/crm/outreach/FollowUpPlanner';

import { QuotationsList } from './pages/accounting/QuotationsList';
import { QuotationBuilder } from './pages/accounting/QuotationBuilder';
import { OTPipeline } from './pages/crm/OTPipeline';
import { InvoicesList } from './pages/accounting/InvoicesList';
import { InvoiceForm } from './pages/accounting/InvoiceForm';
import { InvoiceDetail } from './pages/accounting/InvoiceDetail';

import { AdminAssignment } from './pages/admin/AdminAssignment';
import { IntegrationHub } from './pages/admin/IntegrationHub';
import { MobileSyncHub } from './pages/admin/MobileSyncHub';
import { SuccessToolPage } from './pages/crm/SuccessToolPage';
import { HRManagement } from './pages/hr/HRManagement';
import { IssueReportsPage } from './pages/crm/IssueReportsPage';

// Lazy-loaded Auth pages
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Onboarding = lazy(() => import('./pages/auth/Onboarding').then(m => ({ default: m.Onboarding })));

// Sleek fallback component for chunk loading
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full py-16">
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="text-xs font-medium text-slate-400 dark:text-dark-400">Loading module...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000, // 1 minute cache: instant navigation without blocking loaders
      gcTime: 10 * 60 * 1000, // 10 minutes memory persistence
    }
  }
});

import { useAuthStore } from './store/authStore';

// Access guard that completely blocks sale employees from accessing invoices
const InvoiceAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');
  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');
  const isManager = isAdmin || activeRole === 'Manager';
  const isFinance = activeRole === 'Finance' || activeRole?.toLowerCase().includes('finance');
  const isOperation = ['Operation', 'Operations'].includes(activeRole) || activeRole?.toLowerCase().includes('operat');
  const isSaleEmployee = activeRole === 'Sale Executive' || activeRole === 'Sales Executive' || activeRole === 'Employee';
  const hasInvoiceAccess = !isSaleEmployee && (isAdmin || isManager || isFinance || isOperation);

  if (!hasInvoiceAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Standalone Onboarding Setup Wizard */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected Main CRM Application */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* 1. Lead Management Module */}
              <Route path="/crm/leads" element={<LeadsList defaultMode="all" />} />
              <Route path="/crm/today-leads" element={<LeadsList defaultMode="today" />} />
              <Route path="/crm/today-assigned-leads" element={<LeadsList defaultMode="today" />} />
              <Route path="/crm/open-leads" element={<LeadsList defaultMode="open" />} />
              <Route path="/crm/converted-leads" element={<LeadsList defaultMode="converted" />} />
              <Route path="/crm/lost-leads" element={<LeadsList defaultMode="lost" />} />
              <Route path="/crm/leads/:id" element={<LeadDetail />} />
              <Route path="/crm/bulk-upload" element={<BulkUpload />} />

              {/* 2. Follow-Up & Call Modules */}
              <Route path="/crm/followups" element={<FollowUpPlanner />} />
              <Route path="/crm/follow-up" element={<FollowUpPlanner />} />
              <Route path="/crm/mobile-sync" element={<MobileSyncHub />} />
              <Route path="/crm/success-tool" element={<SuccessToolPage />} />
              <Route path="/tools/success-toolkit" element={<SuccessToolPage />} />

              {/* 3. Quotation, OT Pipeline & Billing Module */}
              <Route path="/accounting/quotations" element={<QuotationsList />} />
              <Route path="/accounting/quotations/new" element={<QuotationBuilder />} />
              <Route path="/accounting/quotations/:id" element={<QuotationBuilder />} />
              <Route path="/crm/ot-pipeline" element={<OTPipeline />} />
              <Route path="/accounting/ot-pipeline" element={<OTPipeline />} />
              <Route path="/accounting/invoices" element={<InvoiceAccessGuard><InvoicesList /></InvoiceAccessGuard>} />
              <Route path="/accounting/invoices/new" element={<InvoiceAccessGuard><InvoiceForm /></InvoiceAccessGuard>} />
              <Route path="/accounting/invoices/:id" element={<InvoiceAccessGuard><InvoiceDetail /></InvoiceAccessGuard>} />

              {/* 4. Admin Assignment & Integrations Panel */}
              <Route path="/admin/assignment" element={<AdminAssignment />} />
              <Route path="/admin/integrations" element={<IntegrationHub />} />
              <Route path="/admin/mobile-sync" element={<MobileSyncHub />} />

              {/* 5. HR Calling & Leads Module */}
              <Route path="/hr" element={<HRManagement />} />

              {/* 6. Employee Issue Reports & Bug Tracker */}
              <Route path="/crm/issues" element={<IssueReportsPage />} />
              <Route path="/issues" element={<IssueReportsPage />} />

              {/* Workspace Settings */}
              <Route path="/settings" element={
                <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Settings</h1>
                    <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">
                      Manage lead assignment preferences, VoIP dialer settings, WhatsApp business configuration, and email dispatch relay.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-dark-800">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/50 border border-slate-200 dark:border-dark-700 space-y-2">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                        <span>💬 WhatsApp Integration</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold">Active</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-dark-400">
                        Standard pre-approved WhatsApp templates and direct wa.me launchers are configured.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/50 border border-slate-200 dark:border-dark-700 space-y-2">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                        <span>✉️ Email Integration</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 font-semibold">Active</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-dark-400">
                        Transactional emails are connected with MailerCloud / SMTP delivery.
                      </p>
                    </div>
                  </div>
                </div>
              } />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
