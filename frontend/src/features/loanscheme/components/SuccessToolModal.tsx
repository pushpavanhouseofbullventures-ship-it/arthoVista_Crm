import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Maximize2, Minimize2, ExternalLink, X, ShieldCheck } from 'lucide-react';
import LoanSchemeWorkspace from './LoanSchemeWorkspace.jsx';

interface SuccessToolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessToolModal: React.FC<SuccessToolModalProps> = ({ isOpen, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenDedicatedPage = () => {
    onClose();
    navigate('/crm/success-tool');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full bg-white dark:bg-dark-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-dark-800 overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized 
            ? 'h-[96vh] max-w-[98vw]' 
            : 'h-[85vh] max-w-6xl'
        }`}
      >
        {/* Top Control Bar for CRM Integration */}
        <div className="px-4 md:px-6 py-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 select-none flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xs tracking-wide text-white">
                Success Tool & Loan Scheme Engine
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                <span>Live Government Catalog</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Open Full Dedicated Page */}
            <button
              onClick={handleOpenDedicatedPage}
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700"
              title="Open full page view at /crm/success-tool"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>Full Page View</span>
            </button>

            {/* Toggle Maximize / Normal */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title={isMaximized ? 'Restore window size' : 'Maximize window'}
            >
              {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 transition border border-rose-500/30 ml-1"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Embedded LoanScheme Workspace */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-50 dark:bg-dark-950">
          <LoanSchemeWorkspace isEmbedded={true} onCloseModal={onClose} />
        </div>
      </div>
    </div>
  );
};

export default SuccessToolModal;
