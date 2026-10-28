import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight, ChevronDown,
  Check, X, ArrowRight, Zap,
  Trophy, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface PipelineStageSelection {
  leadId: string;
  status: 'New' | 'Open' | 'Converted' | 'Lost';
  subStage?: string;
  lostReason?: string;
  transitionNotes?: string;
  paymentExpected?: number;
  paymentReceived?: number;
}


interface PipelineStatusDropdownProps {
  leadId: string;
  currentStatus: string;
  currentSubStage?: string;
  currentLostReason?: string;
  paymentExpected?: number;
  paymentReceived?: number;
  paymentDue?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onSelectStage?: (params: PipelineStageSelection) => void;
  showFastAdvance?: boolean;
  size?: 'sm' | 'md';
}

interface SubOption {
  id: string;
  label: string;
  status: 'New' | 'Open' | 'Converted' | 'Lost';
  subStage?: string;
  lostReason?: string;
}

interface MainStage {
  id: 'leads' | 'converted' | 'lost';
  status: 'New' | 'Open' | 'Converted' | 'Lost';
  label: string;
  colorClass: string;
  badgeBg: string;
  hoverBg: string;
  activeBorder: string;
  textColor: string;
  subOptions: SubOption[];
}

export const PipelineStatusDropdown: React.FC<PipelineStatusDropdownProps> = ({
  leadId,
  currentStatus = 'New',
  currentSubStage,
  currentLostReason,
  paymentExpected,
  paymentReceived,
  paymentDue,
  disabled = false,
  readOnly = false,
  onSelectStage,
  showFastAdvance = true,
  size = 'sm'
}) => {
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');
  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');

  const effectiveExpected = Number(paymentExpected ?? 0);
  const effectiveReceived = Number(paymentReceived ?? 0);
  const effectiveDue = paymentDue !== undefined 
    ? Number(paymentDue) 
    : Math.max(0, effectiveExpected - effectiveReceived);
  const isExpectedLocked = !isAdmin && effectiveExpected > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [targetConversionOption, setTargetConversionOption] = useState<SubOption | null>(null);
  const [conversionExpected, setConversionExpected] = useState<string>('');
  const [conversionReceived, setConversionReceived] = useState<string>('');
  const [conversionNotes, setConversionNotes] = useState<string>('');
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [hoveredStageId, setHoveredStageId] = useState<'leads' | 'converted' | 'lost' | null>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openUpwards: boolean;
  }>({ left: 0, openUpwards: false });
  const [hoverItemTop, setHoverItemTop] = useState<number>(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Normalize current states
  const rawStatus = (currentStatus || 'New').trim().toLowerCase();
  let parentStatus: 'leads' | 'converted' | 'lost' = 'leads';
  if (['converted', 'won'].includes(rawStatus)) {
    parentStatus = 'converted';
  } else if (['lost'].includes(rawStatus)) {
    parentStatus = 'lost';
  } else {
    parentStatus = 'leads';
  }

  const normalizedSubStage = (currentSubStage === 'Payment Expected' || currentSubStage === 'Payment Remaining' || currentSubStage === 'Negotiation')
    ? 'In Process'
    : currentSubStage;
  const activeSubStage = normalizedSubStage || (parentStatus === 'leads' ? (rawStatus === 'new' ? 'New Leads' : 'In Process') : parentStatus === 'converted' ? 'Direct Won' : '');
  const activeLostReason = currentLostReason || (parentStatus === 'lost' ? 'Other' : '');

  // Main Pipeline Tracks Configuration matching CRM Pipelines & Sub-pipelines
  const PIPELINE_CONFIG: MainStage[] = [
    {
      id: 'leads',
      status: 'Open',
      label: 'Leads',
      colorClass: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      hoverBg: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/30',
      activeBorder: 'border-blue-500',
      textColor: 'text-blue-600',
      subOptions: [
        {
          id: 'new_leads',
          label: 'New Leads',
          status: 'New'
        },
        {
          id: 'In Process',
          label: 'In Process',
          status: 'Open',
          subStage: 'In Process'
        },
        {
          id: 'Qualified',
          label: 'Qualified',
          status: 'Open',
          subStage: 'Qualified'
        },
        {
          id: 'Proposal Sent',
          label: 'Proposal Sent',
          status: 'Open',
          subStage: 'Proposal Sent'
        }
      ]
    },
    {
      id: 'converted',
      status: 'Converted',
      label: 'Converted',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      hoverBg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30',
      activeBorder: 'border-emerald-500',
      textColor: 'text-emerald-600',
      subOptions: [
        {
          id: 'Direct Won',
          label: 'Direct Won',
          status: 'Converted',
          subStage: 'Direct Won'
        },
        {
          id: 'Quotation Won',
          label: 'Quotation Won',
          status: 'Converted',
          subStage: 'Quotation Won'
        },
        {
          id: 'Invoiced',
          label: 'Invoiced',
          status: 'Converted',
          subStage: 'Invoiced'
        }
      ]
    },
    {
      id: 'lost',
      status: 'Lost',
      label: 'Lost Leads',
      colorClass: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      hoverBg: 'hover:bg-rose-50/80 dark:hover:bg-rose-950/30',
      activeBorder: 'border-rose-500',
      textColor: 'text-rose-600',
      subOptions: [
        {
          id: 'Price',
          label: 'Price',
          status: 'Lost',
          lostReason: 'Price'
        },
        {
          id: 'No Response',
          label: 'No Response',
          status: 'Lost',
          lostReason: 'No Response'
        },
        {
          id: 'Competitor',
          label: 'Competitor',
          status: 'Lost',
          lostReason: 'Competitor'
        },
        {
          id: 'Not Interested',
          label: 'Not Interested',
          status: 'Lost',
          lostReason: 'Not Interested'
        },
        {
          id: 'Other',
          label: 'Other',
          status: 'Lost',
          lostReason: 'Other'
        }
      ]
    }
  ];

  // Calculate coordinates when opening
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const approximateMenuHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open upwards only when bottom space is tight and there is more room above
    const openUpwards = spaceBelow < approximateMenuHeight && spaceAbove > spaceBelow;
    const menuWidth = 210;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));

    if (openUpwards) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left,
        openUpwards: true
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
        openUpwards: false
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setHoveredStageId(parentStatus);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setHoveredStageId(null);
    }
  };

  // Close when clicking outside or scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        subMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setHoveredStageId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHoveredStageId(null);
        setShowAdvanceModal(false);
      }
    };

    const handleScroll = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // Keep hoverItemTop synced with currently hovered stage item
  useEffect(() => {
    if (isOpen && hoveredStageId && itemRefs.current[hoveredStageId]) {
      const rect = itemRefs.current[hoveredStageId]?.getBoundingClientRect();
      if (rect) {
        setHoverItemTop(rect.top);
      }
    }
  }, [isOpen, hoveredStageId]);

  // Fast Advance Helper
  const getNextFastStage = (): PipelineStageSelection | null => {
    if (parentStatus === 'leads') {
      if (rawStatus === 'new') return { leadId, status: 'Open', subStage: 'In Process' };
      if (activeSubStage === 'In Process') return { leadId, status: 'Open', subStage: 'Qualified' };
      if (activeSubStage === 'Qualified') return { leadId, status: 'Open', subStage: 'Proposal Sent' };
      if (activeSubStage === 'Proposal Sent') return { leadId, status: 'Converted', subStage: 'Direct Won' };
    }
    if (parentStatus === 'converted') {
      if (activeSubStage === 'Direct Won') return { leadId, status: 'Converted', subStage: 'Quotation Won' };
      if (activeSubStage === 'Quotation Won' && effectiveDue <= 0) {
        return { leadId, status: 'Converted', subStage: 'Invoiced' };
      }
    }
    return null;
  };

  const nextFastStage = getNextFastStage();

  const handleSelectOption = (opt: SubOption) => {
    // If moving to Invoiced directly, payment due must be <= 0
    if (opt.subStage === 'Invoiced' || opt.id === 'Invoiced') {
      if (parentStatus === 'converted' && effectiveDue > 0) {
        alert(`Cannot move lead to "Invoiced":\n\nOutstanding payment due is ₹${effectiveDue.toLocaleString('en-IN')}.\nPayment due must be ₹0 or less (fully paid) before moving to Invoiced.`);
        return;
      }
    }

    // If moving to Converted from another stage, require entering payment expected!
    if (opt.status === 'Converted' && parentStatus !== 'converted') {
      setTargetConversionOption(opt);
      setConversionExpected(effectiveExpected > 0 ? String(effectiveExpected) : '');
      setConversionReceived(effectiveReceived > 0 ? String(effectiveReceived) : '');
      setConversionNotes('');
      setConversionError(null);
      setShowConversionModal(true);
      setIsOpen(false);
      setHoveredStageId(null);
      return;
    }

    if (onSelectStage) {
      onSelectStage({
        leadId,
        status: opt.status,
        subStage: opt.subStage,
        lostReason: opt.lostReason
      });
    }
    setIsOpen(false);
    setHoveredStageId(null);
  };

  // Active label & dynamic theme to render in badge
  const currentBadgeTheme = {
    badgeBg:
      rawStatus === 'new'
        ? 'bg-orange-500/10 text-[#fe7c02] dark:text-orange-400 border border-orange-500/25'
        : parentStatus === 'converted'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
          : parentStatus === 'lost'
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25'
            : activeSubStage === 'Qualified'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25'
              : activeSubStage === 'Proposal Sent'
                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25'
  };

  const activeLabel =
    rawStatus === 'new' ? 'New Lead' :
      parentStatus === 'leads' ? (activeSubStage || 'In Process') :
        parentStatus === 'converted' ? (activeSubStage || 'Converted') :
          parentStatus === 'lost' ? (activeLostReason || 'Lost') : 'New Lead';

  const hoveredStage = PIPELINE_CONFIG.find(p => p.id === hoveredStageId);

  // Position submenu right next to hovered main item
  const handleItemHover = (stageId: 'leads' | 'converted' | 'lost', elem: HTMLDivElement | null) => {
    setHoveredStageId(stageId);
    if (elem) {
      const rect = elem.getBoundingClientRect();
      setHoverItemTop(rect.top);
    }
  };

  // Submenu positioning (opens to the right of main menu, or left if near edge)
  const menuWidth = 210;
  const subMenuWidth = 240;
  const isNearRightEdge = coords.left + menuWidth + subMenuWidth + 8 > window.innerWidth;
  const subMenuLeft = isNearRightEdge
    ? Math.max(8, coords.left - subMenuWidth - 4)
    : coords.left + menuWidth + 4;

  const subOptionsCount = hoveredStage?.subOptions.length || 3;
  const estimatedSubHeight = subOptionsCount * 38 + 16;
  let subMenuTop = hoverItemTop > 0 ? hoverItemTop - 4 : (coords.top || 50);
  if (subMenuTop + estimatedSubHeight > window.innerHeight - 8) {
    subMenuTop = Math.max(8, window.innerHeight - estimatedSubHeight - 8);
  }
  if (subMenuTop < 8) {
    subMenuTop = 8;
  }

  if (readOnly) {
    return (
      <div className="inline-flex items-center">
        <span
          className={`inline-flex items-center rounded-xl font-black uppercase tracking-wider border select-none ${
            size === 'md' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[10px]'
          } ${currentBadgeTheme.badgeBg}`}
          title={`Status: ${activeLabel} • Open View Details to change position`}
        >
          <span className="truncate max-w-[130px]">{activeLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-1 relative">
      {/* 1. Trigger Pill Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`inline-flex items-center space-x-1.5 rounded-xl font-black uppercase tracking-wider border transition-all shadow-sm ${size === 'md' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[10px]'
          } ${currentBadgeTheme.badgeBg} hover:shadow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer`}
        title="Click to view & change Pipeline Stage"
      >
        <span className="truncate max-w-[110px]">{activeLabel}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 2. Fast 1-Click Advance Forward Button */}
      {showFastAdvance && nextFastStage && (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (nextFastStage.status === 'Converted' && parentStatus !== 'converted') {
              setTargetConversionOption({
                id: nextFastStage.subStage || 'Converted',
                label: nextFastStage.subStage || 'Payment Received',
                status: 'Converted',
                subStage: nextFastStage.subStage
              });
              setConversionExpected('');
              setConversionReceived('');
              setConversionNotes('');
              setConversionError(null);
              setShowConversionModal(true);
            } else {
              setAdvanceNotes('');
              setShowAdvanceModal(true);
            }
          }}
          title={`Fast Advance: Move to ${nextFastStage.subStage || nextFastStage.status} (Add Handoff Notes)`}
          className="p-1 rounded-lg bg-slate-100/80 hover:bg-amber-100/90 text-slate-500 hover:text-amber-700 dark:bg-dark-800 dark:hover:bg-amber-950/60 dark:text-dark-400 dark:hover:text-amber-300 border border-slate-200/60 dark:border-dark-700 transition shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* 3. Cascading Dropdown Portal (Escapes any table/overflow boundary) */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Backdrop click receiver */}
            <div
              className="fixed inset-0 pointer-events-auto bg-black/5"
              onClick={() => {
                setIsOpen(false);
                setHoveredStageId(null);
              }}
            />

            {/* MAIN PIPELINE MENU */}
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
                ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
                left: `${coords.left}px`,
                width: `${menuWidth}px`
              }}
              className="pointer-events-auto bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border border-slate-200/90 dark:border-dark-700 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
            >
              {/* Main Stages List */}
              <div className="space-y-0.5">
                {PIPELINE_CONFIG.map((stage) => {
                  const isCurrent = parentStatus === stage.id;
                  const isHovered = hoveredStageId === stage.id;

                  return (
                    <div
                      key={stage.id}
                      ref={(el) => {
                        itemRefs.current[stage.id] = el;
                      }}
                      onMouseEnter={(e) => handleItemHover(stage.id, e.currentTarget)}
                      onClick={() => {
                        // If direct click on main item without sub-options
                        if (stage.subOptions.length === 1) {
                          handleSelectOption(stage.subOptions[0]);
                        }
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 ${isHovered
                        ? `${stage.hoverBg} ${stage.textColor} font-bold shadow-xs bg-slate-50 dark:bg-dark-800/80`
                        : isCurrent
                          ? 'bg-slate-100/80 dark:bg-dark-800 text-slate-900 dark:text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate flex items-center space-x-1">
                            <span>{stage.label}</span>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="Current Stage" />
                            )}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${isHovered
                          ? 'translate-x-0.5 text-primary-600 dark:text-primary-400 opacity-100'
                          : 'opacity-40 text-slate-400'
                          }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUB-PIPELINE CASCADING FLYOUT (OPENS JUST TO THE RIGHT SIDE) */}
            {hoveredStage && (
              <div
                ref={subMenuRef}
                style={{
                  position: 'fixed',
                  top: `${subMenuTop}px`,
                  left: `${subMenuLeft}px`,
                  width: `${subMenuWidth}px`
                }}
                onMouseEnter={() => setHoveredStageId(hoveredStage.id)}
                className="pointer-events-auto bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border border-slate-200/90 dark:border-dark-700 rounded-2xl shadow-2xl p-2 space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-150 text-xs select-none"
              >

                {/* Sub-options items */}
                <div className="space-y-1">
                  {hoveredStage.subOptions.map((subOpt) => {
                    const isSelected =
                      (hoveredStage.id === 'leads' && (
                        (subOpt.status === 'New' && rawStatus === 'new') ||
                        (subOpt.status === 'Open' && rawStatus !== 'new' && activeSubStage === subOpt.subStage)
                      )) ||
                      (hoveredStage.id === 'converted' && (
                        activeSubStage === subOpt.subStage || (!activeSubStage && subOpt.subStage === 'Direct Won')
                      )) ||
                      (hoveredStage.id === 'lost' && (
                        activeLostReason === subOpt.lostReason || (!activeLostReason && subOpt.lostReason === 'Other')
                      ));

                    const isInvoiceOption = subOpt.subStage === 'Invoiced' || subOpt.id === 'Invoiced';
                    const isInvoiceBlocked = isInvoiceOption && parentStatus === 'converted' && effectiveDue > 0;

                    return (
                      <div
                        key={subOpt.id}
                        onClick={() => handleSelectOption(subOpt)}
                        className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-150 border ${isSelected
                          ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800/80 shadow-xs'
                          : isInvoiceBlocked
                            ? 'border-transparent bg-slate-50/50 dark:bg-dark-850/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-dark-800/80 hover:border-slate-200/80 dark:hover:border-dark-700'
                          }`}
                        title={isInvoiceBlocked ? `Payment due must be ₹0 or less to invoice (Outstanding Due: ₹${effectiveDue.toLocaleString('en-IN')})` : undefined}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : isInvoiceBlocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                            {subOpt.label}
                          </p>
                          {isInvoiceBlocked && (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 shrink-0">
                              Due: ₹{effectiveDue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="ml-2 flex-shrink-0">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full btn-blue-45 text-white text-[10px] shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 4. Fast Advance Notes Modal (Captured directly into Lead Timeline for Next Employee) */}
      {showAdvanceModal && nextFastStage &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowAdvanceModal(false)}
          >
            <div
              className="relative w-full max-w-lg bg-white dark:bg-dark-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-dark-700 p-6 space-y-4 animate-in zoom-in-95 duration-150 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                    <Zap className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Conversession Notes
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stage Transition Visualizer Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-800/80 border border-slate-200/80 dark:border-dark-700 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Stage</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black border ${currentBadgeTheme.badgeBg}`}>
                    {activeLabel}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center px-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-300 dark:border-amber-800 shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Stage</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs">
                    {nextFastStage.subStage || nextFastStage.status}
                  </span>
                </div>
              </div>

              {/* Conversation / Handover Notes Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-white">
                  📝 Conversation Notes
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="Write notes here"
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStage(nextFastStage);
                      setShowAdvanceModal(false);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
                    title="Advance without adding notes"
                  >
                    Skip Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectStage({
                        ...nextFastStage,
                        transitionNotes: advanceNotes.trim() || undefined
                      });
                      setShowAdvanceModal(false);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Confirm & Advance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 4. Mandatory Conversion to Won Modal (Requires Payment Expected) */}
      {showConversionModal && targetConversionOption &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full max-w-md bg-white dark:bg-dark-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-dark-700 p-6 space-y-4 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
                    <Trophy className="w-5 h-5 fill-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Convert Lead to Won
                    </h3>
                    <p className="text-xs text-slate-400">Target Stage: <span className="font-bold text-emerald-600 dark:text-emerald-400">{targetConversionOption.label}</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConversionModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {conversionError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{conversionError}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-800 dark:text-white">
                      Payment Expected (₹) <span className="text-rose-500">* Required</span>
                    </label>
                    {isExpectedLocked && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        🔒 Admin Locked
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      autoFocus={!isExpectedLocked}
                      required
                      min="1"
                      step="any"
                      disabled={isExpectedLocked}
                      placeholder="e.g. 50000"
                      value={conversionExpected}
                      onChange={(e) => {
                        setConversionExpected(e.target.value);
                        if (conversionError) setConversionError(null);
                      }}
                      className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-mono text-sm font-bold outline-none transition ${
                        isExpectedLocked
                          ? 'bg-slate-100 dark:bg-dark-900 text-slate-400 cursor-not-allowed select-none'
                          : 'bg-slate-50 dark:bg-dark-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {isExpectedLocked ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Payment expected was already filled and is locked for standard employees.</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">Payment expected must be entered when moving a lead to Converted.</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Payment Received / Completed (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (or enter advance collected)"
                      value={conversionReceived}
                      onChange={(e) => setConversionReceived(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {Number(conversionExpected) > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-500">Calculated Due Balance:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      ₹{Math.max(0, Number(conversionExpected) - (Number(conversionReceived) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Conversion Remarks / Handover Notes
                  </label>
                  <textarea
                    rows={2}
                    value={conversionNotes}
                    onChange={(e) => setConversionNotes(e.target.value)}
                    placeholder="Enter deal notes, agreed payment terms, or client confirmation..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowConversionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exp = isExpectedLocked ? effectiveExpected : Number(conversionExpected);
                    if ((!conversionExpected && !isExpectedLocked) || isNaN(exp) || exp <= 0) {
                      setConversionError('Payment Expected amount is required to convert this lead.');
                      return;
                    }
                    const rec = Number(conversionReceived) || 0;
                    const due = Math.max(0, exp - rec);

                    // Restrict moving to Invoiced when payment due > 0
                    if (targetConversionOption.subStage === 'Invoiced' && due > 0) {
                      setConversionError(`Cannot convert to "Invoiced" with pending balance. Outstanding due is ₹${due.toLocaleString('en-IN')}. Payment due must be ₹0 or less before invoicing.`);
                      return;
                    }

                    if (onSelectStage) {
                      onSelectStage({
                        leadId,
                        status: 'Converted',
                        subStage: targetConversionOption.subStage,
                        paymentExpected: exp,
                        paymentReceived: rec,
                        transitionNotes: conversionNotes.trim() || undefined
                      });
                    }
                    setShowConversionModal(false);
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Confirm & Convert</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PipelineStatusDropdown;
