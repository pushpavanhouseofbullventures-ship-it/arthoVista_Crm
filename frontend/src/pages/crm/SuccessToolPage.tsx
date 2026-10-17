import React from 'react';
import LoanSchemeWorkspace from '../../features/loanscheme/components/LoanSchemeWorkspace.jsx';

export const SuccessToolPage: React.FC = () => {
  return (
    <div className="w-full min-h-full rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-dark-800/80 bg-white dark:bg-dark-900 shadow-sm">
      <LoanSchemeWorkspace isEmbedded={false} />
    </div>
  );
};

export default SuccessToolPage;
