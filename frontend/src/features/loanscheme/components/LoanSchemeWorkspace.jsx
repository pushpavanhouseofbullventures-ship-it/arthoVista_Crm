import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import DashboardView from './DashboardView.jsx';
import AdminView from './AdminView.jsx';
import { useSchemes } from '../hooks/useSchemes.js';
import { useBenefits } from '../hooks/useBenefits.js';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import '../loanscheme.css';

function WorkspaceInner({ onCloseModal, isEmbedded = false }) {
  const { schemes, addScheme, updateScheme, deleteScheme, resetToSeed } = useSchemes();
  const { benefits, addBenefit, updateBenefit, deleteBenefit, resetBenefits } = useBenefits();
  const [activeCategory, setActiveCategory] = useState('ALL SCHEMES');
  const [isAdminMode, setIsAdminMode] = useState(false);

  return (
    <div className={`loan-scheme-root app-shell ${isEmbedded ? 'embedded-in-modal' : ''}`}>
      <Sidebar
        schemes={schemes}
        benefits={benefits}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          if (isAdminMode) setIsAdminMode(false);
        }}
      />
      <div className="main-col">
        {isAdminMode ? (
          <AdminView
            schemes={schemes}
            addScheme={addScheme}
            updateScheme={updateScheme}
            deleteScheme={deleteScheme}
            benefits={benefits}
            addBenefit={addBenefit}
            updateBenefit={updateBenefit}
            deleteBenefit={deleteBenefit}
            onExitAdmin={() => setIsAdminMode(false)}
          />
        ) : (
          <DashboardView
            schemes={schemes}
            benefits={benefits}
            resetBenefits={resetBenefits}
            activeCategory={activeCategory}
            onToggleAdmin={() => setIsAdminMode(true)}
            onCloseModal={onCloseModal}
          />
        )}
      </div>
    </div>
  );
}

export default function LoanSchemeWorkspace({ onCloseModal, isEmbedded = false }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <WorkspaceInner onCloseModal={onCloseModal} isEmbedded={isEmbedded} />
      </ToastProvider>
    </AuthProvider>
  );
}
