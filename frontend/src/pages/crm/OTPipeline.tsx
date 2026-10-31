import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  GitBranch, CheckCircle2, FileText, ArrowRight,
  Search, Phone, Mail, MessageSquare,
  Receipt, ArrowUpRight, Clock,
  Kanban, List, Sparkles, ChevronRight,
  Settings2, CheckSquare, Square, UserCheck,
  CreditCard, X, Briefcase, Plus, ShieldCheck,
  Trash2, SlidersHorizontal, AlertTriangle, Unlock, RefreshCw
} from 'lucide-react';

interface QuotationItem {
  id?: string;
  name: string;
  rate: number;
  quantity: number;
  total: number;
}

export type OpsStatus = 'docs_pending' | 'in_progress' | 'completed';
export type FinanceStatus = 'pending_approval' | 'invoiced' | 'paid';

export interface MilestoneItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface OtWorkflowData {
  opsStatus: OpsStatus;
  financeStatus: FinanceStatus;
  financeApproved?: boolean;
  financeApprovedAt?: string;
  financeApprovedBy?: string;
  opsNotes?: string;
  financeNotes?: string;
  opsAssignee?: string;
  financeAssignee?: string;
  milestones: MilestoneItem[];
  lastUpdated?: string;
}

interface QuotationRecord {
  _id: string;
  id?: string;
  quotationId: string;
  totalAmount: number;
  subtotal: number;
  taxTotal: number;
  totalDiscount: number;
  status: string;
  subject?: string;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  leadId?: {
    _id: string;
    id?: string;
    leadId: string;
    name: string;
    company?: string;
    phone: string;
    email?: string;
    location?: string;
    status?: string;
    serviceInterested?: string;
    expectedValue?: number;
    scoreCategory?: string;
    source?: string;
  };
  customerId?: {
    _id: string;
    id?: string;
    name: string;
    companyName?: string;
    phone: string;
    email: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  invoiceId?: {
    _id: string;
    id?: string;
    invoiceId: string;
    status: string;
  subject?: string;
    totalAmount: number;
    outstandingBalance: number;
    amountPaid?: number;
  };
  notes?: string;
}

const DEFAULT_MILESTONES: MilestoneItem[] = [
  { id: 'm1', title: 'Client KYC & Business Document Verification', completed: false },
  { id: 'm2', title: 'Scope of Work & SLA Agreement Sign-off', completed: false },
  { id: 'm3', title: 'Service Execution & Operational Delivery', completed: false },
  { id: 'm4', title: 'Final Deliverables Handover & Client Approval', completed: false }
];

export const OTPipeline: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Role context & validation
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');

  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');
  const isManager = isAdmin || activeRole === 'Manager';
  const isFinance = activeRole === 'Finance' || activeRole?.toLowerCase().includes('finance');
  const isOperation = ['Operation', 'Operations'].includes(activeRole) || activeRole?.toLowerCase().includes('operat');
  const hasOTAccess = isManager || isFinance || isOperation;

  // Strict role separation flags
  const isStrictFinance = isFinance && !isManager && !isAdmin;
  const isStrictOperation = isOperation && !isManager && !isAdmin;

  // Primary filters
  const [departmentTrack, setDepartmentTrack] = useState<'unified' | 'operations' | 'finance'>(() => {
    if (isStrictFinance) return 'finance';
    if (isStrictOperation) return 'operations';
    return 'unified';
  });

  const [search, setSearch] = useState('');
  const [opsFilter, setOpsFilter] = useState<'all' | OpsStatus>('all');
  const [financeFilter, setFinanceFilter] = useState<'all' | FinanceStatus>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Sync track when role activates
  useEffect(() => {
    if (isStrictFinance) {
      setDepartmentTrack('finance');
    } else if (isStrictOperation) {
      setDepartmentTrack('operations');
    }
  }, [isStrictFinance, isStrictOperation]);

  // Modals state
  const [opsModalQuote, setOpsModalQuote] = useState<QuotationRecord | null>(null);
  const [financeModalQuote, setFinanceModalQuote] = useState<QuotationRecord | null>(null);

  // Form states for Operations Modal
  const [editingOpsStatus, setEditingOpsStatus] = useState<OpsStatus>('docs_pending');
  const [editingOpsAssignee, setEditingOpsAssignee] = useState('');
  const [editingOpsNotes, setEditingOpsNotes] = useState('');
  const [editingMilestones, setEditingMilestones] = useState<MilestoneItem[]>(DEFAULT_MILESTONES);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Form states for Finance Modal
  const [editingFinanceStatus, setEditingFinanceStatus] = useState<FinanceStatus>('pending_approval');
  const [editingFinanceAssignee, setEditingFinanceAssignee] = useState('');
  const [editingFinanceNotes, setEditingFinanceNotes] = useState('');

  // Admin & Manager Master Control & Delete states
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<QuotationRecord | null>(null);
  const [masterModalQuote, setMasterModalQuote] = useState<QuotationRecord | null>(null);
  const [masterSubject, setMasterSubject] = useState('');
  const [masterTotalAmount, setMasterTotalAmount] = useState<number>(0);
  const [masterNotes, setMasterNotes] = useState('');
  const [masterFinanceStatus, setMasterFinanceStatus] = useState<FinanceStatus>('pending_approval');
  const [masterFinanceApproved, setMasterFinanceApproved] = useState(false);
  const [masterFinanceNotes, setMasterFinanceNotes] = useState('');
  const [masterFinanceAssignee, setMasterFinanceAssignee] = useState('');
  const [masterOpsStatus, setMasterOpsStatus] = useState<OpsStatus>('docs_pending');
  const [masterOpsNotes, setMasterOpsNotes] = useState('');
  const [masterOpsAssignee, setMasterOpsAssignee] = useState('');
  const [masterMilestones, setMasterMilestones] = useState<MilestoneItem[]>(DEFAULT_MILESTONES);
  const [newMasterMilestone, setNewMasterMilestone] = useState('');
  const [isSavingMaster, setIsSavingMaster] = useState(false);

  // Access Protection
  if (!hasOTAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch accepted and converted quotations (these represent deals entering or active in OT Pipeline)
  const { data: quotationsData, isLoading } = useQuery({
    queryKey: ['ot-pipeline-quotations', search],
    queryFn: async () => {
      const res = await api.get('/quotations', {
        params: {
          status: 'accepted,converted',
          search: search || undefined,
          limit: 100
        }
      });
      return res.data.data;
    }
  });

  const rawQuotations: QuotationRecord[] = quotationsData?.quotations || [];

  // Parse workflow helper
  const parseWorkflow = (quote: QuotationRecord): OtWorkflowData => {
    let workflow: Partial<OtWorkflowData> = {};
    const notesStr = quote.notes || '';
    const match = notesStr.match(/<!--\s*OT_WORKFLOW:\s*(\{.*?\})\s*-->/s);
    if (match) {
      try {
        workflow = JSON.parse(match[1]);
      } catch (e) { }
    } else {
      try {
        if (notesStr.startsWith('{') && notesStr.endsWith('}')) {
          workflow = JSON.parse(notesStr);
        }
      } catch (e) { }
    }

    const isPaid = quote.invoiceId?.status === 'paid' || workflow.financeStatus === 'paid';
    const defaultFinStatus: FinanceStatus = isPaid ? 'paid' : (quote.invoiceId ? 'invoiced' : 'pending_approval');

    return {
      opsStatus: workflow.opsStatus || 'docs_pending',
      financeStatus: workflow.financeStatus || defaultFinStatus,
      financeApproved: Boolean(workflow.financeApproved),
      financeApprovedAt: workflow.financeApprovedAt,
      financeApprovedBy: workflow.financeApprovedBy,
      opsNotes: workflow.opsNotes || '',
      financeNotes: workflow.financeNotes || '',
      opsAssignee: workflow.opsAssignee || '',
      financeAssignee: workflow.financeAssignee || '',
      milestones: workflow.milestones && workflow.milestones.length > 0 ? workflow.milestones : DEFAULT_MILESTONES,
      lastUpdated: workflow.lastUpdated
    };
  };

  // Check if invoice is paid
  const checkIsInvoicePaid = (quote: QuotationRecord, wf: OtWorkflowData): boolean => {
    if (wf.financeStatus === 'paid') return true;
    if (quote.invoiceId?.status === 'paid') return true;
    if (
      quote.invoiceId &&
      (quote.invoiceId.outstandingBalance === 0 || quote.invoiceId.outstandingBalance === undefined) &&
      (quote.invoiceId.totalAmount || 0) > 0
    ) {
      return true;
    }
    return false;
  };

  // Convert Quote to Invoice Mutation
  const convertMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await api.post(`/quotations/${quoteId}/convert-to-invoice`, {});
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Invoice generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data.data?.invoice?._id) {
        navigate(`/accounting/invoices/${data.data.invoice._id}`);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to generate invoice.');
    }
  });

  // Update OT Workflow Mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ quoteId, payload }: { quoteId: string; payload: Partial<OtWorkflowData> }) => {
      const res = await api.patch(`/quotations/${quoteId}/ot-workflow`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setOpsModalQuote(null);
      setFinanceModalQuote(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update OT workflow.');
    }
  });

  // Dedicated Finance Approval & Handover to Operations Mutation
  const approveAndHandoverMutation = useMutation({
    mutationFn: async ({ quoteId, assignee }: { quoteId: string; assignee?: string }) => {
      const approverName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : (user?.email || 'Finance Team');
      const res = await api.patch(`/quotations/${quoteId}/ot-workflow`, {
        financeStatus: 'paid',
        financeApproved: true,
        financeApprovedAt: new Date().toISOString(),
        financeApprovedBy: approverName,
        opsStatus: 'in_progress',
        opsAssignee: assignee || undefined
      });
      return res.data;
    },
    onSuccess: () => {
      alert('Lead approved and handed over to Operations team successfully!');
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setFinanceModalQuote(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to approve lead handover to operations.');
    }
  });

  // Fast Mark Paid Action (for Admin/Finance demo or manual reconciliation)
  const markInvoicePaidMutation = useMutation({
    mutationFn: async (quote: QuotationRecord) => {
      const res = await api.patch(`/quotations/${quote._id}/ot-workflow`, {
        financeStatus: 'paid',
        financeApproved: false // Enters Finance review queue awaiting approval
      });
      return res.data;
    },
    onSuccess: () => {
      alert('Invoice status updated to Paid! Lead is now placed in the Finance review queue.');
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to mark invoice as paid.');
    }
  });

  // Delete OT Pipeline Order Mutation (Admin & Manager)
  const deleteOrderMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await api.delete(`/quotations/${quoteId}`);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'OT Pipeline order deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteQuoteTarget(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete order from OT Pipeline.');
    }
  });

  // Open Master Control Modal (Admin & Manager)
  const handleOpenMasterControlModal = (quote: QuotationRecord) => {
    const wf = parseWorkflow(quote);
    setMasterModalQuote(quote);
    setMasterSubject(quote.subject || quote.items?.[0]?.name || 'Service Order');
    setMasterTotalAmount(Number(quote.totalAmount || 0));
    setMasterNotes(quote.notes?.replace(/<!--\s*OT_WORKFLOW:.*?-->/s, '').trim() || '');
    setMasterFinanceStatus(wf.financeStatus);
    setMasterFinanceApproved(Boolean(wf.financeApproved));
    setMasterFinanceNotes(wf.financeNotes || '');
    setMasterFinanceAssignee(wf.financeAssignee || '');
    setMasterOpsStatus(wf.opsStatus);
    setMasterOpsNotes(wf.opsNotes || '');
    setMasterOpsAssignee(wf.opsAssignee || (quote.assignedTo?.firstName ? `${quote.assignedTo.firstName} ${quote.assignedTo.lastName}` : ''));
    setMasterMilestones(wf.milestones && wf.milestones.length > 0 ? wf.milestones : DEFAULT_MILESTONES);
    setNewMasterMilestone('');
  };

  // Save Master Control
  const handleSaveMasterControl = async () => {
    if (!masterModalQuote) return;
    setIsSavingMaster(true);
    try {
      // 1. Update OT Workflow
      await api.patch(`/quotations/${masterModalQuote._id}/ot-workflow`, {
        financeStatus: masterFinanceStatus,
        financeApproved: masterFinanceApproved,
        financeApprovedAt: masterFinanceApproved ? (parseWorkflow(masterModalQuote).financeApprovedAt || new Date().toISOString()) : undefined,
        financeApprovedBy: masterFinanceApproved ? (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Admin') : undefined,
        financeNotes: masterFinanceNotes,
        financeAssignee: masterFinanceAssignee,
        opsStatus: masterOpsStatus,
        opsNotes: masterOpsNotes,
        opsAssignee: masterOpsAssignee,
        milestones: masterMilestones
      });

      // 2. Update Quotation Details (Subject, Amount, Notes)
      await api.put(`/quotations/${masterModalQuote._id}`, {
        subject: masterSubject,
        totalAmount: Number(masterTotalAmount),
        notes: masterNotes
      });

      alert('OT Pipeline order updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['ot-pipeline-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setMasterModalQuote(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update OT Pipeline order.');
    } finally {
      setIsSavingMaster(false);
    }
  };

  // Toggle milestone in Master modal
  const handleToggleMasterMilestone = (id: string) => {
    setMasterMilestones(prev => prev.map(m => {
      if (m.id === id) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return m;
    }));
  };

  // Add milestone in Master modal
  const handleAddMasterMilestone = () => {
    if (!newMasterMilestone.trim()) return;
    const newM: MilestoneItem = {
      id: `m_${Date.now()}`,
      title: newMasterMilestone.trim(),
      completed: false
    };
    setMasterMilestones(prev => [...prev, newM]);
    setNewMasterMilestone('');
  };

  // Remove milestone in Master modal
  const handleRemoveMasterMilestone = (id: string) => {
    setMasterMilestones(prev => prev.filter(m => m.id !== id));
  };

  // Open Operations Modal
  const handleOpenOpsModal = (quote: QuotationRecord) => {
    const wf = parseWorkflow(quote);
    setOpsModalQuote(quote);
    setEditingOpsStatus(wf.opsStatus);
    setEditingOpsAssignee(wf.opsAssignee || (quote.assignedTo?.firstName ? `${quote.assignedTo.firstName} ${quote.assignedTo.lastName}` : ''));
    setEditingOpsNotes(wf.opsNotes || '');
    setEditingMilestones(wf.milestones);
  };

  // Open Finance Modal
  const handleOpenFinanceModal = (quote: QuotationRecord) => {
    const wf = parseWorkflow(quote);
    setFinanceModalQuote(quote);
    setEditingFinanceStatus(wf.financeStatus);
    setEditingFinanceAssignee(wf.financeAssignee || '');
    setEditingFinanceNotes(wf.financeNotes || '');
  };

  // Save Operations Workflow
  const handleSaveOpsWorkflow = () => {
    if (!opsModalQuote) return;
    updateWorkflowMutation.mutate({
      quoteId: opsModalQuote._id,
      payload: {
        opsStatus: editingOpsStatus,
        opsAssignee: editingOpsAssignee,
        opsNotes: editingOpsNotes,
        milestones: editingMilestones
      }
    });
  };

  // Save Finance Workflow
  const handleSaveFinanceWorkflow = () => {
    if (!financeModalQuote) return;
    updateWorkflowMutation.mutate({
      quoteId: financeModalQuote._id,
      payload: {
        financeStatus: editingFinanceStatus,
        financeAssignee: editingFinanceAssignee,
        financeNotes: editingFinanceNotes
      }
    });
  };

  // Toggle single milestone checkbox
  const handleToggleMilestone = (id: string) => {
    setEditingMilestones(prev => prev.map(m => {
      if (m.id === id) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
      }
      return m;
    }));
  };

  const handleAddMilestone = () => {
    if (!newMilestoneText.trim()) return;
    const newM: MilestoneItem = {
      id: `m_${Date.now()}`,
      title: newMilestoneText.trim(),
      completed: false
    };
    setEditingMilestones(prev => [...prev, newM]);
    setNewMilestoneText('');
  };

  // WhatsApp helper
  const handleWhatsApp = (phone?: string, clientName?: string, quoteId?: string) => {
    if (!phone) {
      alert('No phone number recorded for this lead.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${clientName || 'Valued Client'}, greetings from Artho Vista! Regarding order #${quoteId}, our Operations and Finance teams have verified your project for milestone execution.`
    );
    window.open(`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${text}`, '_blank');
  };

  // =========================================================================
  // STRICT ROLE-BASED PIPELINE FILTERING
  // Rule 1: When lead invoice is paid, it automatically comes to Finance person.
  // Rule 2: Finance person ONLY sees leads pending their approval. Once approved, it goes to Operations.
  // Rule 3: Finance person cannot see leads that have been handed over to Operations.
  // Rule 4: Operation person CANNOT see leads still in Finance stage.
  // Rule 5: Operation person ONLY sees leads approved by Finance.
  // Rule 6: Admin and Manager see both / all.
  // =========================================================================
  const filteredQuotations = useMemo(() => {
    return rawQuotations.filter(q => {
      const wf = parseWorkflow(q);
      const isPaid = checkIsInvoicePaid(q, wf);
      const isApproved = wf.financeApproved === true;

      // 1. Finance Person View:
      if (isStrictFinance) {
        if (financeFilter === 'pending_approval') {
          // Awaiting Handover: Paid and not yet approved
          if (!isPaid || isApproved) return false;
        } else if (financeFilter === 'invoiced') {
          // Billing Pending / Invoiced but unpaid
          if (isPaid) return false;
        } else if (financeFilter === 'paid') {
          // Paid or approved
          if (!isPaid) return false;
        }
        // When 'all', show all proposals in finance track (billing pending, invoiced, awaiting handover, settled)
        return true;
      }

      // 2. Operation Person View:
      if (isStrictOperation) {
        // Can ONLY see leads approved by Finance
        if (!isApproved) return false;
        if (opsFilter !== 'all' && wf.opsStatus !== opsFilter) return false;
        return true;
      }

      // 3. Admin & Manager View (Full cross-department visibility):
      if (departmentTrack === 'operations') {
        // Show leads approved by finance in operations queue
        if (!isApproved && !['in_progress', 'completed'].includes(wf.opsStatus)) return false;
        if (opsFilter !== 'all' && wf.opsStatus !== opsFilter) return false;
      } else if (departmentTrack === 'finance') {
        // Show leads in finance queue
        if (financeFilter === 'pending_approval') {
          if (!isPaid || isApproved) return false;
        } else if (financeFilter === 'paid') {
          if (!isPaid) return false;
        } else if (financeFilter === 'invoiced') {
          if (!q.invoiceId || isPaid) return false;
        }
      } else {
        // Unified track: respect sub-filters if active
        if (opsFilter !== 'all' && wf.opsStatus !== opsFilter) return false;
        if (financeFilter !== 'all' && wf.financeStatus !== financeFilter) return false;
      }

      return true;
    });
  }, [rawQuotations, departmentTrack, opsFilter, financeFilter, isStrictFinance, isStrictOperation]);

  // Aggregate Metrics for Cards
  const totalOrdersCount = rawQuotations.length;
  const totalPipelineValue = rawQuotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);

  // Operations Metrics: leads approved by Finance
  const opsApprovedCount = rawQuotations.filter(q => parseWorkflow(q).financeApproved === true).length;
  const opsInProgressCount = rawQuotations.filter(q => {
    const wf = parseWorkflow(q);
    return wf.financeApproved === true && (wf.opsStatus === 'in_progress' || wf.opsStatus === 'docs_pending');
  }).length;
  const opsCompletedCount = rawQuotations.filter(q => {
    const wf = parseWorkflow(q);
    return wf.financeApproved === true && wf.opsStatus === 'completed';
  }).length;

  // Finance Metrics: leads with paid invoices awaiting Finance approval
  const finBillingPendingCount = rawQuotations.filter(q => !checkIsInvoicePaid(q, parseWorkflow(q))).length;
  const finPaidPendingApprovalCount = rawQuotations.filter(q => {
    const wf = parseWorkflow(q);
    return checkIsInvoicePaid(q, wf) && !wf.financeApproved;
  }).length;
  const finApprovedHandedOverCount = rawQuotations.filter(q => parseWorkflow(q).financeApproved === true).length;
  const finInvoicedCount = rawQuotations.filter(q => !!q.invoiceId || parseWorkflow(q).financeStatus === 'invoiced').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 btn-tri-45 to-slate-950 border rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#fe7c02]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 -mb-16 w-64 h-64 bg-[#028825]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl md:text-3xl font-black">
                OT Pipeline
              </h1>
              {isStrictFinance && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center space-x-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Finance Desk • Billing & Approval Operations</span>
                </span>
              )}
              {isStrictOperation && (
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[11px] font-bold flex items-center space-x-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Operations Desk • Approved Handover Queue</span>
                </span>
              )}
              {(isAdmin || isManager) && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin & Manager Oversight</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/accounting/quotations"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 btn-tri-45 border border-white/20 text-white font-bold text-xs transition flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>All Quotations</span>
            </Link>
            {(isAdmin || isManager) && (
              <Link
                to="/accounting/quotations/new"
                className="px-4 py-2.5 rounded-2xl btn-tri-45 font-black text-xs transition shadow-lg flex items-center space-x-2 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>New Proposal</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Department Track Switcher Banner */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-dark-400 px-3 hidden sm:inline">
            Department Track:
          </span>
          <div className="flex bg-slate-100/90 dark:bg-dark-950 p-1 rounded-xl border border-slate-200/80 dark:border-dark-800 text-xs font-bold">
            {/* Unified Pipeline Tab (Admin / Manager only) */}
            {(isAdmin || isManager) && (
              <button
                onClick={() => {
                  setDepartmentTrack('unified');
                  setOpsFilter('all');
                  setFinanceFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-2 cursor-pointer ${departmentTrack === 'unified'
                  ? 'btn-blue-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Unified Pipeline</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${departmentTrack === 'unified' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-300'
                  }`}>
                  {totalOrdersCount}
                </span>
              </button>
            )}

            {/* Operations Track Tab (Admin, Manager, or Operation) */}
            {(isAdmin || isManager || isStrictOperation) && (
              <button
                onClick={() => {
                  setDepartmentTrack('operations');
                  setOpsFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-2 cursor-pointer ${departmentTrack === 'operations'
                  ? 'btn-orange-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Operations Track</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${departmentTrack === 'operations' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-300'
                  }`}>
                  {opsApprovedCount} Approved
                </span>
              </button>
            )}

            {/* Finance Track Tab (Admin, Manager, or Finance) */}
            {(isAdmin || isManager || isStrictFinance) && (
              <button
                onClick={() => {
                  setDepartmentTrack('finance');
                  setFinanceFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center space-x-2 cursor-pointer ${departmentTrack === 'finance'
                  ? 'btn-green-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Finance Track</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${departmentTrack === 'finance' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-300'
                  }`}>
                  {finBillingPendingCount > 0 ? `${finBillingPendingCount} Pending Action` : `${rawQuotations.length} Deals`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 ml-auto">
          <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'list'
                ? 'bg-white dark:bg-dark-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              title="Table List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'kanban'
                ? 'bg-white dark:bg-dark-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              title="Kanban Board View"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Pipeline Metric Cards (Context-aware by role) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        {isStrictFinance ? (
          <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-amber-400/50 transition-all">
            <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-amber-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">Billing Pending</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {finBillingPendingCount}
            </div>
            <p className="text-[11px] text-slate-400">Proposals requiring invoicing or payment</p>
          </div>
        ) : isStrictOperation ? (
          <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-orange-400/50 transition-all">
            <div className="h-1 w-full absolute top-0 left-0 btn-orange-45" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">Operations Queue</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#fe7c02] dark:text-orange-400 border border-orange-500/20">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#fe7c02] dark:text-orange-400">
              {opsApprovedCount}
            </div>
            <p className="text-[11px] text-slate-400">Approved orders handed over by Finance</p>
          </div>
        ) : (
          <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-blue-400/50 transition-all">
            <div className="h-1 w-full absolute top-0 left-0 btn-blue-45" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">Total OT Orders</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <GitBranch className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalOrdersCount}
            </div>
            <p className="text-[11px] text-slate-400">All proposals in pipeline</p>
          </div>
        )}

        {/* Card 2: Operations Active / Finance Awaiting Handover */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-emerald-400/50 transition-all">
          <div className="h-1 w-full absolute top-0 left-0 btn-green-45" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">
              {isStrictFinance ? 'Awaiting Handover' : 'In Execution'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {isStrictFinance ? finPaidPendingApprovalCount : opsInProgressCount}
          </div>
          <p className="text-[11px] text-slate-400">
            {isStrictFinance ? 'Paid invoices ready for Ops handover' : 'Active milestone delivery tasks'}
          </p>
        </div>

        {/* Card 3: Finance Pending / Handed Over to Ops */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-purple-400/50 transition-all">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">
              {isStrictFinance ? 'Handed Over to Ops' : isStrictOperation ? 'KYC Verification' : 'Finance Review'}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {isStrictFinance
              ? finApprovedHandedOverCount
              : isStrictOperation
                ? rawQuotations.filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'docs_pending').length
                : finPaidPendingApprovalCount}
          </div>
          <p className="text-[11px] text-slate-400">
            {isStrictFinance
              ? 'Successfully passed to Operations'
              : isStrictOperation
                ? 'Awaiting onboarding documents'
                : 'Paid deals ready for approval'}
          </p>
        </div>

        {/* Card 4: Delivered / Settled */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 shadow-sm space-y-2 group hover:border-emerald-400/50 transition-all">
          <div className="h-1 w-full absolute top-0 left-0 btn-green-45" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-400">
              {isStrictOperation ? 'Delivered Orders' : 'Invoiced & Settled'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-[#028825] dark:text-emerald-400 border border-emerald-500/20">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#028825] dark:text-emerald-400">
            {isStrictOperation ? opsCompletedCount : finInvoicedCount}
          </div>
          <p className="text-[11px] text-slate-400">₹{totalPipelineValue.toLocaleString('en-IN')} pipeline value</p>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-dark-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-dark-800 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search lead, company, phone, QT ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Role-based Sub-Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {departmentTrack === 'operations' ? (
            <div className="flex bg-slate-100/80 dark:bg-dark-950/70 p-1 rounded-xl border border-slate-200/70 dark:border-dark-800 text-xs font-semibold">
              <button
                onClick={() => setOpsFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'all'
                  ? 'btn-blue-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                All Operations
              </button>
              <button
                onClick={() => setOpsFilter('docs_pending')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'docs_pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                📄 KYC Pending
              </button>
              <button
                onClick={() => setOpsFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'in_progress'
                  ? 'btn-orange-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                ⚙️ In Execution
              </button>
              <button
                onClick={() => setOpsFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'completed'
                  ? 'btn-green-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                ✅ Delivered
              </button>
            </div>
          ) : departmentTrack === 'finance' ? (
            <div className="flex bg-slate-100/80 dark:bg-dark-950/70 p-1 rounded-xl border border-slate-200/70 dark:border-dark-800 text-xs font-semibold">
              <button
                onClick={() => setFinanceFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'all'
                  ? 'btn-blue-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                All Finance ({rawQuotations.length})
              </button>
              <button
                onClick={() => setFinanceFilter('invoiced')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'invoiced'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                ⏳ Billing Pending ({finBillingPendingCount})
              </button>
              <button
                onClick={() => setFinanceFilter('pending_approval')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'pending_approval'
                  ? 'btn-green-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                💳 Paid • Ready for Ops ({finPaidPendingApprovalCount})
              </button>
              <button
                onClick={() => setFinanceFilter('paid')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'paid'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                ✅ Handed Over ({finApprovedHandedOverCount})
              </button>
            </div>
          ) : (
            <div className="flex bg-slate-100/80 dark:bg-dark-950/70 p-1 rounded-xl border border-slate-200/70 dark:border-dark-800 text-xs font-semibold">
              <button
                onClick={() => {
                  setOpsFilter('all');
                  setFinanceFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'all' && financeFilter === 'all'
                  ? 'btn-blue-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                All Deals ({totalOrdersCount})
              </button>
              <button
                onClick={() => {
                  setOpsFilter('in_progress');
                  setFinanceFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${opsFilter === 'in_progress'
                  ? 'btn-orange-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Ops In-Progress ({opsInProgressCount})
              </button>
              <button
                onClick={() => {
                  setOpsFilter('all');
                  setFinanceFilter('pending_approval');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'pending_approval'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Finance Review ({finPaidPendingApprovalCount})
              </button>
              <button
                onClick={() => {
                  setOpsFilter('all');
                  setFinanceFilter('paid');
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${financeFilter === 'paid'
                  ? 'btn-green-45 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                Fully Settled
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Content Area */}
      {isLoading ? (
        <div className="p-16 text-center bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-sm space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-xs text-slate-400">Loading OT Pipeline records...</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 mx-auto flex items-center justify-center">
            <GitBranch className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {isStrictFinance
                ? financeFilter === 'pending_approval'
                  ? 'No Paid Leads Awaiting Handover Approval'
                  : financeFilter === 'invoiced'
                    ? 'No Leads with Billing Pending'
                    : 'No Deals in Finance Track'
                : isStrictOperation
                  ? 'No Deals Currently in Operations Queue'
                  : 'No Proposals Matching Selected Filter'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-400 max-w-md mx-auto">
              {isStrictFinance
                ? 'Deals with accepted proposals appear here for billing, invoice management, and handover approval to Operations.'
                : isStrictOperation
                  ? 'Leads will appear here as soon as the Finance person approves the payment handover.'
                  : 'Proposals marked Accepted or Invoiced will appear in the pipeline according to role workflows.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-800/50 text-[11px] font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Lead & Client Details</th>
                  <th className="py-3.5 px-4">Service & Value</th>
                  {!isStrictFinance && <th className="py-3.5 px-4">⚙️ Operations Track</th>}
                  {!isStrictOperation && <th className="py-3.5 px-4">💰 Finance Track</th>}
                  <th className="py-3.5 px-4 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-xs">
                {filteredQuotations.map((quote) => {
                  const lead = quote.leadId;
                  const customer = quote.customerId;
                  const clientName = lead?.name || customer?.name || 'Valued Client';
                  const companyName = lead?.company || customer?.companyName || 'Private Enterprise';
                  const clientPhone = lead?.phone || customer?.phone || '';
                  const clientEmail = lead?.email || customer?.email || '';
                  const quoteId = quote.quotationId || `QT-${quote._id.slice(0, 8).toUpperCase()}`;
                  const wf = parseWorkflow(quote);
                  const isPaid = checkIsInvoicePaid(quote, wf);
                  const isApproved = wf.financeApproved === true;

                  const completedMilestones = wf.milestones.filter(m => m.completed).length;
                  const totalMilestones = wf.milestones.length;

                  return (
                    <tr key={quote._id} className="hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition">
                      {/* 1. Lead & Company */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {lead?._id ? (
                              <Link
                                to={`/crm/leads/${lead._id}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-blue-600 transition flex items-center space-x-1"
                              >
                                <span>{clientName}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-60" />
                              </Link>
                            ) : (
                              <span className="font-bold text-slate-900 dark:text-white">{clientName}</span>
                            )}
                            {lead?.leadId && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-[10px] font-semibold text-slate-500 font-mono">
                                {lead.leadId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                            <span className="font-medium text-slate-700 dark:text-dark-300">{companyName}</span>
                            {lead?.location && <span>• {lead.location}</span>}
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                            {clientPhone && (
                              <span className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{clientPhone}</span>
                              </span>
                            )}
                            {clientEmail && (
                              <span className="flex items-center space-x-1 truncate max-w-[150px]">
                                <Mail className="h-3 w-3" />
                                <span>{clientEmail}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Service & Proposal Value */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 dark:text-dark-200">
                            {lead?.serviceInterested || quote.items[0]?.name || 'Commercial Services'}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              ₹{Number(quote.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                            <Link
                              to={`/accounting/quotations/${quote._id}`}
                              className="text-[10px] font-mono text-blue-600 hover:underline"
                            >
                              {quoteId}
                            </Link>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Accepted: {new Date(quote.date || Date.now()).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </td>

                      {/* 3. Operations Track Column (Hidden from Finance Person) */}
                      {!isStrictFinance && (
                        <td className="py-4 px-4">
                          {!isApproved ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-dark-800 dark:text-dark-400 text-[10px] font-bold">
                                <Clock className="h-3 w-3" />
                                <span>Locked • Awaiting Finance Approval</span>
                              </span>
                              <div className="text-[10px] text-slate-400">Handover pending from Finance</div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                {wf.opsStatus === 'docs_pending' && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-bold">
                                    <span>📄 KYC & Docs Pending</span>
                                  </span>
                                )}
                                {wf.opsStatus === 'in_progress' && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-bold">
                                    <span>⚙️ In Execution</span>
                                  </span>
                                )}
                                {wf.opsStatus === 'completed' && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">
                                    <span>✅ Completed & Delivered</span>
                                  </span>
                                )}

                                <button
                                  onClick={() => handleOpenOpsModal(quote)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-dark-800 transition cursor-pointer"
                                  title="Update Operations Workflow & Milestones"
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Milestones Mini Bar */}
                              <div className="space-y-0.5 max-w-[160px]">
                                <div className="flex justify-between text-[10px] text-slate-500 dark:text-dark-400">
                                  <span>Milestones</span>
                                  <span className="font-bold">{completedMilestones}/{totalMilestones}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-dark-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="btn-blue-45 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(completedMilestones / totalMilestones) * 100}%` }}
                                  />
                                </div>
                              </div>

                              {wf.opsAssignee && (
                                <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                                  <UserCheck className="h-3 w-3 text-slate-400" />
                                  <span>Ops: {wf.opsAssignee}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}

                      {/* 4. Finance Track Column (Hidden from Operations Person) */}
                      {!isStrictOperation && (
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              {!isPaid ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] font-bold">
                                  <span>⏳ Billing Pending</span>
                                </span>
                              ) : !isApproved ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 text-[10px] font-bold">
                                  <span>💳 Paid • Awaiting Approval</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">
                                  <span>✅ Handed Over to Ops</span>
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenFinanceModal(quote)}
                                className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-dark-800 transition cursor-pointer"
                                title="Update Finance Stage & Billing Notes"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {quote.invoiceId ? (
                              <Link
                                to={`/accounting/invoices/${quote.invoiceId._id || quote.invoiceId.id}`}
                                className="inline-flex items-center space-x-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                <Receipt className="h-3 w-3" />
                                <span>{quote.invoiceId.invoiceId || 'Invoice Generated'}</span>
                              </Link>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                No tax invoice issued yet
                              </div>
                            )}

                            {isApproved && wf.financeApprovedBy && (
                              <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                                <UserCheck className="h-3 w-3 text-slate-400" />
                                <span>Approved by: {wf.financeApprovedBy}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 5. Quick Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* WhatsApp */}
                          {clientPhone && (
                            <button
                              onClick={() => handleWhatsApp(clientPhone, clientName, quoteId)}
                              title="Notify Client via WhatsApp"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}

                          {/* Action 1: Finance Approval & Handover Button */}
                          {(isStrictFinance || isAdmin || isManager) && isPaid && !isApproved && (
                            <button
                              onClick={() => approveAndHandoverMutation.mutate({ quoteId: quote._id })}
                              disabled={approveAndHandoverMutation.isPending}
                              className="px-3.5 py-1.5 rounded-xl btn-green-45 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                              title="Approve lead payment and handover to Operations team"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Approve & Handover</span>
                            </button>
                          )}

                          {/* Action 2: Operations Trigger (Only if approved by Finance) */}
                          {(isStrictOperation || isAdmin || isManager) && isApproved && (
                            <button
                              onClick={() => handleOpenOpsModal(quote)}
                              className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Manage Operations Execution"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              <span>Ops Tasks</span>
                            </button>
                          )}

                          {/* Action 3: Admin / Finance Bill & Payment triggers */}
                          {(isStrictFinance || isAdmin || isManager) && !isPaid && (
                            <>
                              {!quote.invoiceId ? (
                                <button
                                  onClick={() => convertMutation.mutate(quote._id)}
                                  disabled={convertMutation.isPending}
                                  className="px-3 py-1.5 rounded-xl btn-green-45 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1 active:scale-95 cursor-pointer"
                                >
                                  <Receipt className="h-3.5 w-3.5" />
                                  <span>Bill Now</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => markInvoicePaidMutation.mutate(quote)}
                                  disabled={markInvoicePaidMutation.isPending}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                                  title="Mark invoice as paid so deal enters Finance review queue"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Mark Paid</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Action 4: Direct Unlock (Admin/Manager Fast Override) */}
                          {(isAdmin || isManager) && !isApproved && (
                            <button
                              onClick={() => approveAndHandoverMutation.mutate({ quoteId: quote._id })}
                              disabled={approveAndHandoverMutation.isPending}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                              title="Admin/Manager Direct Override: Unlock & Handover to Operations"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>Unlock Ops</span>
                            </button>
                          )}

                          {/* Action 5: Master Manage & Edit (Admin/Manager) */}
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => handleOpenMasterControlModal(quote)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                              title="Admin & Manager Full Command: Edit Deal Details, Milestones & Stages"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
                              <span>Manage</span>
                            </button>
                          )}

                          {/* Action 6: Delete Order (Admin/Manager) */}
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => setDeleteQuoteTarget(quote)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 transition cursor-pointer"
                              title="Delete OT Pipeline Order (Admin/Manager)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        departmentTrack === 'finance' ? (
          /* FINANCE TRACK KANBAN */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Col 1: Invoicing & Billing Pending */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    1. Invoicing & Billing Pending
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  {finBillingPendingCount}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => !checkIsInvoicePaid(q, parseWorkflow(q)))
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';
                    const quoteId = quote.quotationId || `QT-${quote._id.slice(0, 8).toUpperCase()}`;

                    return (
                      <div
                        key={`fin-col1-${quote._id}`}
                        className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm hover:shadow-md transition space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{quoteId}</div>
                          </div>
                          <button
                            onClick={() => handleOpenFinanceModal(quote)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-base font-black text-slate-900 dark:text-white">
                          ₹{Number(quote.totalAmount || 0).toLocaleString('en-IN')}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                          {!quote.invoiceId ? (
                            <button
                              onClick={() => convertMutation.mutate(quote._id)}
                              className="px-3 py-1 rounded-xl btn-green-45 text-white text-[11px] font-bold shadow-sm flex items-center space-x-1 cursor-pointer active:scale-95"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>Issue Tax Invoice</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <Link
                                to={`/accounting/invoices/${quote.invoiceId._id || quote.invoiceId.id}`}
                                className="text-[11px] font-bold text-purple-600 hover:underline flex items-center space-x-1"
                              >
                                <Receipt className="h-3 w-3" />
                                <span>{quote.invoiceId.invoiceId || 'Invoice Generated'}</span>
                              </Link>
                              <button
                                onClick={() => markInvoicePaidMutation.mutate(quote)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Mark Paid</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Col 2: Invoices Paid - Awaiting Finance Approval (CORE QUEUE FOR FINANCE) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    {isStrictFinance ? 'Paid Leads Awaiting Your Approval' : '2. Paid • Awaiting Finance Approval'}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  {finPaidPendingApprovalCount}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => {
                    const wf = parseWorkflow(q);
                    return checkIsInvoicePaid(q, wf) && !wf.financeApproved;
                  })
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';

                    return (
                      <div
                        key={`fin-col2-${quote._id}`}
                        className="p-5 rounded-3xl bg-white dark:bg-dark-900 border-2 border-emerald-500/30 dark:border-emerald-600/30 shadow-md space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-base">{clientName}</div>
                            <div className="text-[11px] text-emerald-600 font-mono font-bold flex items-center space-x-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>INVOICE PAID • ₹{Number(quote.totalAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenFinanceModal(quote)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-dark-300">
                          {lead?.serviceInterested || quote.items[0]?.name || 'Commercial Services'}
                        </p>

                        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 text-xs text-emerald-900 dark:text-emerald-200">
                          Payment has been cleared. Approving this lead will automatically transfer it to the Operations fulfillment queue.
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenFinanceModal(quote)}
                            className="text-xs font-bold text-slate-600 hover:text-emerald-600 cursor-pointer"
                          >
                            Add Notes
                          </button>
                          <button
                            onClick={() => approveAndHandoverMutation.mutate({ quoteId: quote._id })}
                            disabled={approveAndHandoverMutation.isPending}
                            className="px-4 py-2 rounded-xl btn-green-45 text-white text-xs font-black shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Approve & Handover to Ops</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Col 3: Approved & Handed Over (Finance, Admin & Manager) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    3. Handed Over to Ops
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-xs font-bold">
                  {finApprovedHandedOverCount}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => parseWorkflow(q).financeApproved === true)
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';
                    const wf = parseWorkflow(quote);

                    return (
                      <div
                        key={`fin-col3-${quote._id}`}
                        className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</div>
                            <div className="text-[11px] text-emerald-600 font-mono font-bold">
                              Approved by {wf.financeApprovedBy || 'Finance'}
                            </div>
                          </div>
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </div>

                        <div className="text-xs text-slate-500">
                          Active in Operations: {wf.opsStatus === 'completed' ? 'Delivered' : 'In Execution'}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          /* OPERATIONS TRACK KANBAN (STRICTLY APPROVED DEALS ONLY) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Col 1: KYC & Docs Pending */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    1. KYC & Docs Pending
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold">
                  {rawQuotations.filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'docs_pending').length}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'docs_pending')
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';
                    const quoteId = quote.quotationId || `QT-${quote._id.slice(0, 8).toUpperCase()}`;
                    const wf = parseWorkflow(quote);

                    return (
                      <div
                        key={`ops-col1-${quote._id}`}
                        className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{quoteId}</div>
                          </div>
                          <button
                            onClick={() => handleOpenOpsModal(quote)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 text-[11px] text-slate-600 dark:text-dark-300 space-y-1">
                          <div className="font-bold text-slate-800 dark:text-white">Awaiting KYC Documents</div>
                          <div>Service: {lead?.serviceInterested || 'Consulting'}</div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenOpsModal(quote)}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            Checklist ({wf.milestones.filter(m => m.completed).length}/{wf.milestones.length})
                          </button>
                          <button
                            onClick={() => {
                              updateWorkflowMutation.mutate({
                                quoteId: quote._id,
                                payload: { opsStatus: 'in_progress' }
                              });
                            }}
                            className="px-3 py-1 rounded-xl btn-blue-45 text-white text-[11px] font-bold shadow-sm flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Start Execution</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Col 2: Service Execution In-Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    2. Service Execution In-Progress
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-bold">
                  {rawQuotations.filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'in_progress').length}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'in_progress')
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';
                    const wf = parseWorkflow(quote);

                    return (
                      <div
                        key={`ops-col2-${quote._id}`}
                        className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</div>
                            <div className="text-[11px] text-blue-600 font-bold">Execution Active</div>
                          </div>
                          <button
                            onClick={() => handleOpenOpsModal(quote)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Milestones Check Overview */}
                        <div className="space-y-1">
                          {wf.milestones.slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-dark-300">
                              {m.completed ? (
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                              )}
                              <span className={`truncate ${m.completed ? 'line-through text-slate-400' : ''}`}>
                                {m.title}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenOpsModal(quote)}
                            className="text-xs font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
                          >
                            Update Tasks
                          </button>
                          <button
                            onClick={() => {
                              updateWorkflowMutation.mutate({
                                quoteId: quote._id,
                                payload: { opsStatus: 'completed' }
                              });
                            }}
                            className="px-3 py-1 rounded-xl btn-green-45 text-white text-[11px] font-bold shadow-sm flex items-center space-x-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Sign Off</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Col 3: Operations Completed & Delivered */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    3. Operations Delivered
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  {rawQuotations.filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'completed').length}
                </span>
              </div>

              <div className="space-y-3">
                {rawQuotations
                  .filter(q => parseWorkflow(q).financeApproved && parseWorkflow(q).opsStatus === 'completed')
                  .map(quote => {
                    const lead = quote.leadId;
                    const clientName = lead?.name || quote.customerId?.name || 'Valued Client';

                    return (
                      <div
                        key={`ops-col3-${quote._id}`}
                        className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</div>
                            <div className="text-[11px] text-emerald-600 font-bold">Deliverables Handed Over</div>
                          </div>
                          <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </div>

                        {lead?._id && (
                          <Link
                            to={`/crm/leads/${lead._id}`}
                            className="w-full inline-flex items-center justify-center space-x-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 text-slate-700 dark:text-dark-200 font-bold text-xs transition"
                          >
                            <span>Open Client File</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: OPERATIONS WORKFLOW & MILESTONES (Operation Role / Admin) */}
      {/* ========================================================================= */}
      {opsModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between bg-slate-50/50 dark:bg-dark-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#fe7c02] dark:text-orange-400 border border-orange-500/20 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Operations Fulfillment Track
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Proposal #{opsModalQuote.quotationId} • {opsModalQuote.leadId?.name || 'Client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpsModalQuote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Stage Selector */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Operations Fulfillment Stage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOpsStatus('docs_pending')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingOpsStatus === 'docs_pending'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">📄</div>
                    <div className="font-bold">1. Docs Pending</div>
                    <div className="text-[10px] text-slate-400">KYC verification</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingOpsStatus('in_progress')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingOpsStatus === 'in_progress'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">⚙️</div>
                    <div className="font-bold">2. In Execution</div>
                    <div className="text-[10px] text-slate-400">Milestones active</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingOpsStatus('completed')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingOpsStatus === 'completed'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">✅</div>
                    <div className="font-bold">3. Completed</div>
                    <div className="text-[10px] text-slate-400">Service delivered</div>
                  </button>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                    Operational Milestones & KYC Checklist
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {editingMilestones.filter(m => m.completed).length}/{editingMilestones.length} Completed
                  </span>
                </div>

                <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200/80 dark:border-dark-700">
                  {editingMilestones.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleToggleMilestone(m.id)}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-dark-800 cursor-pointer hover:border-blue-400 transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        {m.completed ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300 dark:text-dark-500 flex-shrink-0" />
                        )}
                        <span className={`font-semibold ${m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                          {m.title}
                        </span>
                      </div>
                      {m.completedAt && (
                        <span className="text-[9px] text-emerald-600 font-mono">
                          Done
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Add Custom Milestone */}
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add custom milestone..."
                      value={newMilestoneText}
                      onChange={(e) => setNewMilestoneText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMilestone();
                        }
                      }}
                      className="flex-1 p-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      className="px-3 py-2 rounded-xl btn-blue-45 text-white font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Operations Assignee */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Operations Officer / Lead Assignee
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations Specialist or Team Lead"
                  value={editingOpsAssignee}
                  onChange={(e) => setEditingOpsAssignee(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Handover & Execution Notes */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Operations Handover & Client Service Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail client deliverables, meeting logs, technical setup notes..."
                  value={editingOpsNotes}
                  onChange={(e) => setEditingOpsNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-800/50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setOpsModalQuote(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOpsWorkflow}
                disabled={updateWorkflowMutation.isPending}
                className="px-5 py-2 rounded-xl btn-orange-45 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {updateWorkflowMutation.isPending ? 'Saving...' : 'Save Operations Track'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: FINANCE WORKFLOW & BILLING (Finance Role / Admin) */}
      {/* ========================================================================= */}
      {financeModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between bg-slate-50/50 dark:bg-dark-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-[#028825] dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Finance & Billing Track
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Proposal #{financeModalQuote.quotationId} • ₹{Number(financeModalQuote.totalAmount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFinanceModalQuote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Handover to Operations Banner & Action */}
              {checkIsInvoicePaid(financeModalQuote, parseWorkflow(financeModalQuote)) && !parseWorkflow(financeModalQuote).financeApproved && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-black text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Invoice Payment Verified</span>
                      </div>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                        Payment has been received. Click below to approve and handover this project to the Operations team.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      approveAndHandoverMutation.mutate({ quoteId: financeModalQuote._id, assignee: editingFinanceAssignee });
                    }}
                    disabled={approveAndHandoverMutation.isPending}
                    className="w-full py-2.5 rounded-xl btn-green-45 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Handover to Operations</span>
                  </button>
                </div>
              )}

              {/* Financial Stage Selector */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Billing & Payment Settlement Stage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFinanceStatus('pending_approval')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingFinanceStatus === 'pending_approval'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">⏳</div>
                    <div className="font-bold">1. Review / Terms</div>
                    <div className="text-[10px] text-slate-400">Pending approval</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingFinanceStatus('invoiced')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingFinanceStatus === 'invoiced'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">🧾</div>
                    <div className="font-bold">2. Invoiced</div>
                    <div className="text-[10px] text-slate-400">GST Tax Bill issued</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingFinanceStatus('paid')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer ${editingFinanceStatus === 'paid'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <div className="text-sm mb-0.5">💳</div>
                    <div className="font-bold">3. Paid & Cleared</div>
                    <div className="text-[10px] text-slate-400">Payment received</div>
                  </button>
                </div>
              </div>

              {/* Tax Invoice Banner / Action */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-dark-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-900 dark:text-white text-xs">
                      Official Tax Invoice
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-dark-400">
                      {financeModalQuote.invoiceId
                        ? `Invoice #${financeModalQuote.invoiceId.invoiceId || 'Issued'} linked to this proposal.`
                        : 'No official invoice issued yet for this deal.'}
                    </p>
                  </div>
                  {financeModalQuote.invoiceId ? (
                    <Link
                      to={`/accounting/invoices/${financeModalQuote.invoiceId._id || financeModalQuote.invoiceId.id}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center space-x-1"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>View Invoice</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => convertMutation.mutate(financeModalQuote._id)}
                      disabled={convertMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl btn-green-45 text-white font-bold text-xs shadow-md transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Generate Now</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Finance Officer Assignee */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Finance Officer / Billing Assignee
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finance Officer or Billing Manager"
                  value={editingFinanceAssignee}
                  onChange={(e) => setEditingFinanceAssignee(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Payment & Billing Notes */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                  Billing Notes / Transaction Reference / TDS Info
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Advance 50% received via NEFT/UPI Ref #12345. Balance 50% due on delivery..."
                  value={editingFinanceNotes}
                  onChange={(e) => setEditingFinanceNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-800/50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setFinanceModalQuote(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFinanceWorkflow}
                disabled={updateWorkflowMutation.isPending}
                className="px-5 py-2 rounded-xl btn-green-45 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {updateWorkflowMutation.isPending ? 'Saving...' : 'Save Finance Track'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: DELETE OT PIPELINE ORDER (Admin & Manager) */}
      {/* ========================================================================= */}
      {deleteQuoteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete OT Pipeline Order</h3>
                <p className="text-xs text-slate-400">Admin & Manager Authorization</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete order <strong className="font-bold text-slate-900 dark:text-white">#{deleteQuoteTarget.quotationId || deleteQuoteTarget._id}</strong> for <strong className="font-bold text-slate-900 dark:text-white">{deleteQuoteTarget.leadId?.name || deleteQuoteTarget.customerId?.name || 'Valued Client'}</strong>? This will remove the deal and quotation from the OT Pipeline.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setDeleteQuoteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteOrderMutation.mutate(deleteQuoteTarget._id)}
                disabled={deleteOrderMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center space-x-1.5 shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {deleteOrderMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: ADMIN & MANAGER MASTER CONTROL (Full Edit, Unlock & Track Override) */}
      {/* ========================================================================= */}
      {masterModalQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-dark-800 dark:to-dark-850">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Master OT Order Management
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Order #{masterModalQuote.quotationId} • {masterModalQuote.leadId?.name || masterModalQuote.customerId?.name || 'Client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMasterModalQuote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* SECTION 1: Deal & Client Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200/80 dark:border-dark-700 space-y-3">
                <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span>Deal Details & Commercials</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Service / Subject</label>
                    <input
                      type="text"
                      value={masterSubject}
                      onChange={(e) => setMasterSubject(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Total Deal Amount (₹)</label>
                    <input
                      type="number"
                      value={masterTotalAmount}
                      onChange={(e) => setMasterTotalAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Order Notes</label>
                  <input
                    type="text"
                    value={masterNotes}
                    onChange={(e) => setMasterNotes(e.target.value)}
                    placeholder="Key project scope or special client requirements..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SECTION 2: Direct Override & Operations Handover */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-blue-900 dark:text-blue-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Unlock className="h-4 w-4 text-blue-600" />
                      <span>Operations Handover Status</span>
                    </h4>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400 mt-0.5">
                      Toggle to immediately unlock Operations execution without waiting for billing approval.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={masterFinanceApproved}
                      onChange={(e) => setMasterFinanceApproved(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-dark-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {masterFinanceApproved ? (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Unlocked for Operations Execution</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Locked awaiting Finance Handover Approval</span>
                  </span>
                )}
              </div>

              {/* SECTION 3: Finance Track */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200/80 dark:border-dark-700 space-y-3">
                <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                  <span>Finance & Billing Track</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Finance Status</label>
                    <select
                      value={masterFinanceStatus}
                      onChange={(e) => setMasterFinanceStatus(e.target.value as FinanceStatus)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="pending_approval">⏳ Pending Approval</option>
                      <option value="invoiced">🧾 Invoiced</option>
                      <option value="paid">✅ Paid & Settled</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Finance Assignee</label>
                    <input
                      type="text"
                      placeholder="e.g. Pooja Sharma (Finance)"
                      value={masterFinanceAssignee}
                      onChange={(e) => setMasterFinanceAssignee(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Finance / Transaction Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Advance received, TDS, or payment terms..."
                    value={masterFinanceNotes}
                    onChange={(e) => setMasterFinanceNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* SECTION 4: Operations Track & Milestones */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200/80 dark:border-dark-700 space-y-3">
                <h4 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Settings2 className="h-4 w-4 text-orange-500" />
                  <span>Operations Execution Track</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Operations Status</label>
                    <select
                      value={masterOpsStatus}
                      onChange={(e) => setMasterOpsStatus(e.target.value as OpsStatus)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                    >
                      <option value="docs_pending">📄 1. Docs Pending</option>
                      <option value="in_progress">⚙️ 2. In Execution</option>
                      <option value="completed">✅ 3. Completed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Operations Assignee</label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Malhotra (Operations)"
                      value={masterOpsAssignee}
                      onChange={(e) => setMasterOpsAssignee(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-[11px]">
                      Milestones Checklist ({masterMilestones.filter(m => m.completed).length}/{masterMilestones.length})
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    {masterMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-dark-800"
                      >
                        <div
                          onClick={() => handleToggleMasterMilestone(m.id)}
                          className="flex items-center space-x-2.5 cursor-pointer flex-1"
                        >
                          {m.completed ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-dark-500 flex-shrink-0" />
                          )}
                          <span className={`font-semibold ${m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                            {m.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMasterMilestone(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition ml-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add new milestone task..."
                        value={newMasterMilestone}
                        onChange={(e) => setNewMasterMilestone(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMasterMilestone(); } }}
                        className="flex-1 p-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMasterMilestone}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Operations Execution Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Milestone updates, delivery notes, or government filing IDs..."
                    value={masterOpsNotes}
                    onChange={(e) => setMasterOpsNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-800/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = masterModalQuote;
                  setMasterModalQuote(null);
                  setDeleteQuoteTarget(target);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Order</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMasterModalQuote(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterControl}
                  disabled={isSavingMaster}
                  className="px-5 py-2 rounded-xl btn-blue-45 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSavingMaster ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>{isSavingMaster ? 'Saving...' : 'Save All Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OTPipeline;
