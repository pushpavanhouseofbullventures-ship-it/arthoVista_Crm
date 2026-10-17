import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const AuthLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const organizations = useAuthStore((state) => state.organizations);

  // If already authenticated, direct to Dashboard or Onboarding
  if (isAuthenticated) {
    if (organizations.length === 0) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-dark-950 transition-colors duration-200">
      {/* Left Column: Visual branding banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0c4a6e] via-[#0057b7] to-[#04611d] dark:from-dark-950 dark:via-[#003875] dark:to-dark-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Decorative Grid SVG background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* 45-Degree Brand Glow Orbs */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#fe7c02]/25 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#028825]/25 blur-3xl pointer-events-none"></div>
        
        {/* Logo */}
        <div className="z-10 flex items-center space-x-3.5">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Artho Vista Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-2xl tracking-tight leading-tight text-white">Artho Vista</span>
              <span className="text-[10px] font-black bg-orange-500/30 text-orange-200 px-1.5 py-0.5 rounded border border-orange-400/50">CRM</span>
            </div>
            <span className="text-xs font-semibold text-emerald-300 tracking-wide mt-0.5">सपनों से समृद्धि तक</span>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="z-10 max-w-md my-auto space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            The Operating System for Modern Indian Businesses.
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed font-light">
            Manage your sales pipeline, deals, payments, GST invoices, and service workflows inside a secure, permission-aware environment.
          </p>
          <div className="flex items-center space-x-4 pt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs font-bold">1</div>
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs font-bold">2</div>
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs font-bold">3</div>
            </div>
            <span className="text-sm text-primary-200">Trusted by over 100+ professional consultancy teams.</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="z-10 text-xs text-slate-400 font-light flex justify-between">
          <span>&copy; {new Date().getFullYear()} Artho Vista. All rights reserved.</span>
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
        </div>
      </div>

      {/* Right Column: Dynamic login/register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
