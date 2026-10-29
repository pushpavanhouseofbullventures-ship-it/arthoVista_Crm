import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminSubscriptions: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Full Enterprise Access Enabled</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Office CRM operates in unrestricted mode without subscription tier limitations.</p>
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-dark-800 flex space-x-3">
        <Link
          to="/dashboard"
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
