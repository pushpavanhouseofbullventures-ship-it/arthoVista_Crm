import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeft, Phone, MessageSquare, Mail, FileText,
  Calendar, Plus, History, ArrowRightLeft,
  CheckCircle2, Zap, XCircle, Edit3, Save, X,
  Loader2, Send, Clock, Trash2, Bell, Check,
  RefreshCw, StickyNote, Smartphone, ShieldCheck, Wallet
} from 'lucide-react';
import { PipelineStatusDropdown } from '../../components/PipelineStatusDropdown';

const convertTimeTo24 = (timeStr: string = '11:00 AM') => {
  const parts = timeStr.trim().split(' ');
  const time = parts[0] || '11:00';
  const modifier = (parts[1] || 'AM').toUpperCase();
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  if (modifier === 'PM' && h < 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
};

const getCallOutcomeFromActivity = (act: any): { tag: string; color: string } | null => {
  const outcome = act.metadata?.outcome || act.metadata?.callOutcome || (() => {
    const match = act.content?.match(/Outcome:\s*([A-Za-z\s/]+)/i);
    return match ? match[1].trim() : null;
  })();

  if (!outcome && !['call', 'phone'].includes(act.type)) return null;

  const raw = (outcome || '').toLowerCase();
  if (raw.includes('no answer')) {
    return { tag: '❌ No Answer', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' };
  }
  if (raw.includes('busy')) {
    return { tag: '📵 Busy', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' };
  }
  if (raw.includes('switched off') || raw.includes('unreachable')) {
    return { tag: '📴 Switched Off', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-dark-800 dark:text-slate-300 dark:border-dark-700' };
  }
  if (raw.includes('call back') || raw.includes('callback')) {
    return { tag: '⏱️ Call Back Later', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' };
  }
  if (raw.includes('interested')) {
    return { tag: '👍 Connected & Interested', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
  }
  if (raw.includes('not interested')) {
    return { tag: '🚫 Not Interested', color: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-dark-800 dark:text-zinc-300 dark:border-dark-700' };
  }
  if (raw.includes('wrong number')) {
    return { tag: '⚠️ Wrong Number', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' };
  }
  if (raw.includes('converted') || raw.includes('won')) {
    return { tag: '🤝 Converted / Won', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
  }
  if (raw.includes('missed') || raw.includes('rejected')) {
    return { tag: '❌ Missed / Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' };
  }
  if (outcome) {
    return { tag: `📞 ${outcome}`, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-dark-800 dark:text-slate-300 dark:border-dark-700' };
  }
  return null;
};

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');
  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');
  const isManager = isAdmin || activeRole === 'Manager';
  const isPrivileged = isManager;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'timeline' | 'quotations' | 'assignment' | 'schedule'>('timeline');

  // Timeline Filter State (matching Screenshot 2 filter chips)
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'calls' | 'stages' | 'followups' | 'notes' | 'system'>('all');

  // Quick Note state
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteCategory, setQuickNoteCategory] = useState('General Note');

  // Edit Lead Modal state (For Admins/Managers)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    whatsApp: '',
    alternatePhone: '',
    source: 'Website',
    serviceInterested: '',
    productInterested: '',
    priority: 'medium',
    expectedValue: 0,
    paymentExpected: 0,
    paymentReceived: 0,
    assignedTo: '',
    notes: ''
  });

  // Fetch Employees for Reassignment in Edit Modal
  const { data: repsData } = useQuery({
    queryKey: ['employees-master-list'],
    queryFn: async () => {
      const res = await api.get('/assignment/config');
      return res.data.data?.reps || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Call & Dialer state
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimerInterval, setCallTimerInterval] = useState<any>(null);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [callOutcome, setCallOutcome] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [callAudioUrl] = useState<string | null>(null);
  const [dialerFallbackWarning, setDialerFallbackWarning] = useState(false);

  // WhatsApp & Email modal state
  const [activeActionModal, setActiveActionModal] = useState<'whatsapp' | 'email' | null>(null);
  const [waTemplate, setWaTemplate] = useState('quotation_followup');
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // Status Change State Machine Modal
  const [statusModal, setStatusModal] = useState<{ open: boolean; targetStatus: string }>({ open: false, targetStatus: '' });
  const [lostReason, setLostReason] = useState('Price');
  const [lostNotes, setLostNotes] = useState('');
  const [adminOverrideReason, setAdminOverrideReason] = useState('');
  const [statusModalPaymentExpected, setStatusModalPaymentExpected] = useState<string>('');
  const [statusModalPaymentReceived, setStatusModalPaymentReceived] = useState<string>('0');
  const [reopenModal, setReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Commercial & Payment tracking state (Any employee can open and edit)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentExpectedInput, setPaymentExpectedInput] = useState<string>('');
  const [paymentReceivedInput, setPaymentReceivedInput] = useState<string>('');
  const [paymentUpdateNotes, setPaymentUpdateNotes] = useState<string>('');

  // Conversion requirement modal when moving to Converted from pipeline buttons
  const [conversionModal, setConversionModal] = useState<{ open: boolean; targetStatus: string; targetSubStage?: string } | null>(null);
  const [conversionExpectedInput, setConversionExpectedInput] = useState<string>('');
  const [conversionReceivedInput, setConversionReceivedInput] = useState<string>('0');
  const [conversionNotesInput, setConversionNotesInput] = useState<string>('');

  // Next Follow-Up scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [followupDate, setFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [followupTime, setFollowupTime] = useState('11:00 AM');
  const [followupChannel, setFollowupChannel] = useState<'phone' | 'whatsapp' | 'email'>('phone');
  const [followupPriority, setFollowupPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [followupPurpose, setFollowupPurpose] = useState('Proposal Follow-Up & Review');
  const [followupNotes, setFollowupNotes] = useState('');

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getInDaysDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handleOpenScheduleModal = () => {
    if (lead?.nextFollowUp) {
      try {
        setFollowupDate(new Date(lead.nextFollowUp).toISOString().split('T')[0]);
      } catch (e) {
        setFollowupDate(getTomorrowDate());
      }
    } else {
      setFollowupDate(getTomorrowDate());
    }
    setShowScheduleModal(true);
  };

  // 1. Fetch Lead Details
  const { data: leadData, isLoading } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data.data;
    }
  });

  // Fetch all scheduled follow-ups for this lead
  const { data: leadFollowupsData } = useQuery({
    queryKey: ['lead-followups', id],
    queryFn: async () => {
      const res = await api.get('/outreach/followups', { params: { leadId: id } });
      return res.data.data || [];
    },
    enabled: !!id
  });
  const leadFollowups = leadFollowupsData || [];

  const lead = leadData?.lead;
  const activities = leadData?.activities || [];
  const quotations = leadData?.quotations || [];
  const assignmentLogs = leadData?.assignmentLogs || [];

  const assignedId = (typeof lead?.assignedTo === 'object' && lead?.assignedTo)
    ? ((lead?.assignedTo as any)?._id || (lead?.assignedTo as any)?.id)
    : lead?.assignedTo;
  const isAssigned = Boolean(assignedId && user && (String(assignedId) === String((user as any)._id || user.id)));
  const canEdit = isPrivileged || isAssigned;

  // Update follow-up date when loaded
  useEffect(() => {
    if (lead?.nextFollowUp) {
      setFollowupDate(new Date(lead.nextFollowUp).toISOString().split('T')[0]);
    }
  }, [lead]);

  // Lead Status Update Mutation - 0ms Optimistic UI
  const updateStatusMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/leads/${id}`, payload);
      return res.data;
    },
    onMutate: async (payload: any) => {
      await queryClient.cancelQueries({ queryKey: ['lead-detail', id] });
      const previousData = queryClient.getQueryData(['lead-detail', id]);

      // Instantly update lead state in memory
      queryClient.setQueryData(['lead-detail', id], (old: any) => {
        if (!old || !old.lead) return old;
        return {
          ...old,
          lead: { ...old.lead, ...payload }
        };
      });
      setStatusModal({ open: false, targetStatus: '' });
      return { previousData };
    },
    onError: (err: any, _, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['lead-detail', id], context.previousData);
      }
      alert(err.response?.data?.message || 'Status transition failed.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setAdminOverrideReason('');
      setLostNotes('');
    }
  });

  // Reopen Closed Lead Mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/leads/${id}/reopen`, { reason: reopenReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setReopenModal(false);
      setReopenReason('');
      alert('Lead successfully reopened into Active pipeline.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to reopen lead.');
    }
  });

  // Admin / Manager Update Lead Information Mutation
  const updateLeadInfoMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/leads/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowEditModal(false);
      alert('Lead information updated successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update lead information.');
    }
  });

  const handleOpenEditModal = () => {
    if (!lead) return;
    const assignedId = (typeof lead.assignedTo === 'object' && lead.assignedTo)
      ? ((lead.assignedTo as any)._id || (lead.assignedTo as any).id)
      : lead.assignedTo;

    setEditForm({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      whatsApp: lead.whatsApp || lead.phone || '',
      alternatePhone: lead.alternatePhone || '',
      source: lead.source || 'Website',
      serviceInterested: lead.serviceInterested || '',
      productInterested: lead.productInterested || '',
      priority: lead.priority || 'medium',
      expectedValue: Number(lead.expectedValue) || Number(lead.paymentExpected) || 0,
      paymentExpected: Number(lead.paymentExpected ?? lead.expectedValue ?? 0),
      paymentReceived: Number(lead.paymentReceived ?? 0),
      assignedTo: assignedId ? assignedId.toString() : '',
      notes: lead.notes || ''
    });
    setShowEditModal(true);
  };

  // Schedule Follow-Up Mutation (Creates full FollowUp entity + updates Lead.nextFollowUp)
  const createFollowUpMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/followups', payload);
      return res.data;
    },
    onSuccess: () => {
      alert('Follow-up scheduled successfully! The assigned employee will see the exact time on their dashboard and follow-up queue.');
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-followups', id] });
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setFollowupNotes('');
      setShowScheduleModal(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to schedule follow-up.');
    }
  });

  // Update Follow-Up Status Mutation (Mark Done / Complete)
  const updateFollowUpStatusMutation = useMutation({
    mutationFn: async ({ followupId, status, outcome }: { followupId: string; status: string; outcome?: string }) => {
      const res = await api.put(`/outreach/followups/${followupId}`, { status, outcome });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-followups', id] });
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  });

  // Quick Dispatch Mutation (Lead Status & Sub-Pipeline change)
  const quickDispatchMutation = useMutation({
    mutationFn: async ({ leadId, status, subStage, lostReason, transitionNotes, paymentExpected, paymentReceived }: { leadId: string; status?: string; subStage?: string; lostReason?: string; transitionNotes?: string; paymentExpected?: number; paymentReceived?: number }) => {
      const payload: any = {};
      if (status) payload.status = status;
      if (subStage) {
        payload.leadType = subStage;
        payload.subStage = subStage;
      }
      if (status === 'Lost') {
        payload.lostReason = lostReason || 'Other';
      }
      if (status === 'Converted') {
        payload.adminOverrideReason = 'Direct Dispatch';
      }
      if (paymentExpected !== undefined && paymentExpected !== null) {
        payload.paymentExpected = Number(paymentExpected);
      }
      if (paymentReceived !== undefined && paymentReceived !== null) {
        payload.paymentReceived = Number(paymentReceived);
      }
      if (transitionNotes) {
        payload.transitionNotes = transitionNotes;
      }
      const res = await api.put(`/leads/${leadId}`, payload);
      return res.data;
    },
    onMutate: async (newStage) => {
      await queryClient.cancelQueries({ queryKey: ['lead-detail', id] });
      const previousData = queryClient.getQueryData(['lead-detail', id]);
      queryClient.setQueryData(['lead-detail', id], (old: any) => {
        if (!old || !old.lead) return old;
        return {
          ...old,
          lead: {
            ...old.lead,
            status: newStage.status || old.lead.status,
            leadType: newStage.subStage || old.lead.leadType,
            paymentExpected: newStage.paymentExpected !== undefined ? newStage.paymentExpected : old.lead.paymentExpected,
            paymentReceived: newStage.paymentReceived !== undefined ? newStage.paymentReceived : old.lead.paymentReceived,
            lostReason: newStage.status === 'Lost' ? (newStage.lostReason || 'Other') : (newStage.status ? null : old.lead.lostReason),
            lostNotes: newStage.status === 'Lost' ? old.lead.lostNotes : (newStage.status ? null : old.lead.lostNotes)
          }
        };
      });
      return { previousData };
    },
    onError: (err: any, _, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(['lead-detail', id], context.previousData);
      }
      alert(err.response?.data?.message || 'Failed to update lead status.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  });

  // Dedicated Update Payment Mutation (Any employee can update payment info anytime)
  const updatePaymentMutation = useMutation({
    mutationFn: async (payload: { paymentExpected: number; paymentReceived: number; transitionNotes?: string }) => {
      const res = await api.put(`/leads/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowPaymentModal(false);
      alert('Payment details updated successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update payment information.');
    }
  });

  // Delete Follow-Up Mutation
  const deleteFollowUpMutation = useMutation({
    mutationFn: async (followupId: string) => {
      const res = await api.delete(`/outreach/followups/${followupId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-followups', id] });
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  // Call Follow-Up Mutation
  const logCallMutation = useMutation({
    mutationFn: async () => {
      let nextDateTime: string | undefined = undefined;
      if (followupDate) {
        const time24 = convertTimeTo24(followupTime || '11:00 AM');
        nextDateTime = `${followupDate}T${time24}:00.000Z`;
      }

      const res = await api.post('/outreach/calls/manual', {
        leadId: id,
        phoneNumber: lead.phone,
        direction: 'outbound',
        duration: callDuration,
        outcome: callOutcome,
        notes: callNotes || `Call completed with outcome: ${callOutcome}`,
        nextFollowUpDate: nextDateTime,
        nextFollowUpChannel: followupChannel,
        nextFollowUpPurpose: `Follow-up after ${callOutcome}`,
        recordingUrl: callAudioUrl || undefined
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-followups', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      queryClient.invalidateQueries({ queryKey: ['calls-dashboard'] });
      setShowCallLogModal(false);
      setCallDuration(0);
      setCallNotes('');
    }
  });

  // Dispatch Email Mutation (Direct Backend Mailer Engine)
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: { to: string; subject: string; text?: string; leadId?: string }) => {
      const res = await api.post('/outreach/email/send', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setEmailSuccessMsg('Email dispatched successfully!');
        setEmailErrorMsg(null);
        queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        setTimeout(() => {
          setEmailSuccessMsg(null);
          setActiveActionModal(null);
        }, 1500);
      } else {
        setEmailErrorMsg(data.error || data.message || 'Failed to dispatch email.');
      }
    },
    onError: (err: any) => {
      setEmailErrorMsg(err.response?.data?.message || err.message || 'Error dispatching email.');
    }
  });

  // Quick Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ note }: { note: string }) => {
      const res = await api.post(`/leads/${id}/notes`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      setQuickNoteText('');
      setShowQuickNoteModal(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save note.');
    }
  });

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 172800) return 'Yesterday';
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };



  // Start Click-to-Call Handlers
  const handleStartCall = () => {
    if (!lead?.phone) {
      alert('This lead does not have a valid phone number.');
      return;
    }

    setIsCalling(true);
    setCallDuration(0);

    // Start timer
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimerInterval(interval);

    // Launch tel: link
    try {
      window.location.href = `tel:${lead.phone}`;
    } catch (e) {
      setDialerFallbackWarning(true);
    }
  };

  const handleEndCall = () => {
    if (callTimerInterval) clearInterval(callTimerInterval);
    setIsCalling(false);
    setShowCallLogModal(true);
  };

  const WA_TEMPLATES: Record<string, { title: string; text: (name: string, service?: string) => string }> = {
    quotation_followup: {
      title: 'Quotation Follow-up & Review',
      text: (name, service) => `Hello ${name}, hope you are doing well. We shared the customized proposal for ${service || 'our services'}. Have you had a chance to review it? Let us know if you need any adjustments or clarification!`
    },
    welcome_intro: {
      title: 'Welcome & Initial Introduction',
      text: (name, service) => `Hi ${name}, thank you for connecting with ArthaVenture regarding ${service || 'business solutions'}. When would be a good time for a quick 5-minute discussion today?`
    },
    document_reminder: {
      title: 'Pending Document Collection',
      text: (name, service) => `Dear ${name}, to proceed with your ${service || 'application'}, please share the required documentation at your earliest convenience.`
    }
  };

  const handleOpenWhatsApp = () => {
    setWaTemplate('quotation_followup');
    setWaCustomMessage(WA_TEMPLATES.quotation_followup.text(lead.name, lead.serviceInterested));
    setActiveActionModal('whatsapp');
  };

  const handleLaunchWhatsApp = () => {
    if (!lead) return;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(waCustomMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setActiveActionModal(null);
  };

  const handleOpenEmail = () => {
    if (!lead?.email) {
      alert('This lead does not have an email address specified.');
      return;
    }
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);
    setEmailSubject(`Proposal Follow-up: ArthaVenture — ${lead.serviceInterested || 'Services'}`);
    setEmailBody(`Dear ${lead.name},\n\nThank you for your interest in our services. We look forward to connecting.\n\nPlease feel free to contact us with any questions.\n\nWarm regards,\nSales Team\nArthaVenture`);
    setActiveActionModal('email');
  };

  if (isLoading) {
    return <div className="py-16 text-center text-xs text-slate-400">Loading lead profile...</div>;
  }

  if (!lead) {
    return <div className="py-16 text-center text-xs text-slate-400">Lead not found.</div>;
  }



  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Header Banner with Profile, ID & Actions */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark+-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <Link
              to="/crm/leads"
              className="mt-1 p-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-300 hover:bg-slate-200 transition"
              title="Back to Leads"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/40">
                  #{lead.leadId}
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{lead.name}</h1>
                <PipelineStatusDropdown
                  leadId={lead._id || lead.id || id}
                  currentStatus={lead.status || 'New'}
                  currentSubStage={lead.leadType || (lead.convertedInvoiceId ? 'Invoiced' : lead.convertedQuotationId ? 'Quotation Won' : undefined)}
                  currentLostReason={lead.lostReason}
                  paymentExpected={lead.paymentExpected ?? lead.expectedValue}
                  paymentReceived={lead.paymentReceived}
                  paymentDue={lead.paymentDue !== undefined ? Number(lead.paymentDue) : Math.max(0, Number(lead.paymentExpected ?? lead.expectedValue ?? 0) - Number(lead.paymentReceived ?? 0))}
                  disabled={quickDispatchMutation.isPending}
                  onSelectStage={({ leadId, status, subStage, lostReason, transitionNotes, paymentExpected, paymentReceived }) => {
                    quickDispatchMutation.mutate({ leadId: leadId || id, status, subStage, lostReason, transitionNotes, paymentExpected, paymentReceived });
                  }}
                />
              </div>

              {/* Lead Metadata Subtitle Row (Matching Screenshot 2) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-dark-300">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  <span>Service:</span> <span className="font-bold text-slate-900 dark:text-white">{lead.serviceInterested || lead.productInterested || 'General Service'}</span>
                </span>
                {lead.createdAt && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">Created {new Date(lead.createdAt).toLocaleDateString('en-IN')}</span>
                  </>
                )}

                {/* Next Scheduled Follow-Up Badge (Clickable to Reschedule) */}
                {(() => {
                  const upcoming = leadFollowups.find((f: any) => f.status === 'pending');
                  if (!upcoming && !lead.nextFollowUp) return null;
                  const targetDate = upcoming?.date || lead.nextFollowUp;
                  return (
                    <button
                      type="button"
                      onClick={handleOpenScheduleModal}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold transition cursor-pointer group ml-1"
                      title="Click to reschedule follow-up"
                    >
                      <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400 group-hover:rotate-12 transition-transform" />
                      <span>
                        Next Follow-Up: {new Date(targetDate).toLocaleDateString('en-IN')} {upcoming?.time ? `at ${upcoming.time}` : ''}
                        {upcoming?.channel ? ` (${upcoming.channel.toUpperCase()})` : ''}
                      </span>
                      <Edit3 className="h-2.5 w-2.5 ml-0.5 text-purple-500 opacity-60 group-hover:opacity-100" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-col items-start lg:items-end gap-2.5">
            {dialerFallbackWarning && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
                Direct softphone link unavailable. Manual dialing recommended: <span className="font-bold">{lead.phone}</span>
              </div>
            )}

            {/* Row 1: Primary Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Call Button */}
              {!isCalling ? (
                <button
                  onClick={handleStartCall}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call {lead.phone}</span>
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md animate-pulse"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>End Call ({callDuration}s)</span>
                </button>
              )}

              {/* WhatsApp Button */}
              <button
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 font-bold text-xs transition border border-emerald-200/60 dark:border-emerald-800/60"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>

              {/* Email Button */}
              <button
                onClick={handleOpenEmail}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs transition border border-blue-200/60 dark:border-blue-800/60"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </button>

              {/* Schedule Follow-Up Button */}
              <button
                type="button"
                onClick={handleOpenScheduleModal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-500/20 active:scale-95 group"
                title="Schedule Next Follow-Up"
              >
                <Calendar className="h-3.5 w-3.5 text-purple-200 group-hover:rotate-6 transition-transform" />
                <span>Schedule Follow-Up</span>
              </button>

              {/* Create Quotation Button */}
              <Link
                to={`/accounting/quotations/new?leadId=${lead._id}`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl btn-blue-45 text-white font-bold text-xs transition shadow-md active:scale-95"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Create Quotation</span>
              </Link>

              {/* Quick Note Button */}
              <button
                type="button"
                onClick={() => setShowQuickNoteModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 font-bold text-xs transition border border-amber-200 dark:border-amber-800 shadow-2xs cursor-pointer"
                title="Add a quick note to this lead"
              >
                <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Quick Note</span>
              </button>
            </div>

            {/* Row 2: Secondary Utility Buttons (Matching Screenshot 2) */}
            <div className="flex items-center space-x-2">
              {/* Edit Details */}
              {canEdit && (
                <button
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-700 dark:text-slate-200 font-bold text-xs transition border border-slate-200 dark:border-dark-700 shadow-2xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {lead.status === 'Lost' && (
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-black border border-rose-200 dark:border-rose-800">
                ⚠️ Lead Lost ({lead.lostReason || 'Other'})
              </span>
              <button
                type="button"
                onClick={() => setReopenModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer"
                title="Reopen lead back into Active Pipeline"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Reopen Lead</span>
              </button>
            </div>
          )}
          {lead.status === 'Converted' && (
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs font-black border border-emerald-200 dark:border-emerald-800">
                🎉 Converted (Won)
              </span>
              <button
                type="button"
                onClick={() => setReopenModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:hover:bg-dark-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                title="Reopen lead back into Active Pipeline"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Reopen Lead</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Commercial & Payment Tracking Card */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Metrics and Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700 rounded-2xl px-4 py-2.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected</span>
                <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">
                  ₹{Number(lead.paymentExpected ?? lead.expectedValue ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-px h-7 bg-slate-200 dark:bg-dark-700"></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Number(lead.paymentReceived ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-px h-7 bg-slate-200 dark:bg-dark-700"></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Balance</span>
                <span className="text-sm font-mono font-black text-rose-600 dark:text-rose-400">
                  ₹{(lead.paymentDue !== undefined && lead.paymentDue !== null
                    ? Number(lead.paymentDue)
                    : Math.max(0, Number(lead.paymentExpected ?? lead.expectedValue ?? 0) - Number(lead.paymentReceived ?? 0))
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Edit Payment Button accessible by any employee */}
            <button
              type="button"
              onClick={() => {
                setPaymentExpectedInput(String(lead.paymentExpected ?? lead.expectedValue ?? 0));
                setPaymentReceivedInput(String(lead.paymentReceived ?? 0));
                setPaymentUpdateNotes('');
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl btn-tri-45 text-white font-bold text-xs shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
              title="Update Payment Expected or Received amount"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Payment</span>
            </button>
          </div>
        </div>
      </div>



      {/* 3. Sub-Tabs Bar */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-dark-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'timeline'
            ? 'btn-blue-45 text-white shadow-sm'
            : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Follow-Up & Activity Timeline ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'quotations'
            ? 'btn-blue-45 text-white shadow-sm'
            : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Quotations & Invoices ({quotations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'assignment'
            ? 'btn-blue-45 text-white shadow-sm'
            : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Assignment History ({assignmentLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'schedule'
            ? 'btn-blue-45 text-white shadow-sm'
            : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Follow-Up Reminders ({leadFollowups.length})</span>
        </button>
      </div>

      {/* TAB 1: SIM CALL HISTORY & ACTIVITY TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Card Header with Live SIM Sync Badge & Refresh Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-dark-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
                <Smartphone className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    SIM Call History & Timeline
                  </h2>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live SIM Sync</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Chronological timeline of calls, call outcomes, follow-ups, and customer touchpoints.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['lead-detail', id] })}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-dark-700 self-start sm:self-auto cursor-pointer"
              title="Refresh Activity Timeline"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Interactive Filter Chips Row (Matching Screenshot 2) */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All Events', count: activities.length, icon: null },
              { key: 'calls', label: 'SIM Calls', count: activities.filter((a: any) => a.type === 'call' || a.type === 'phone' || a.metadata?.source === 'android_sim_sync' || a.content?.includes('SIM Call')).length, icon: Phone },
              { key: 'stages', label: 'Stage Changes', count: activities.filter((a: any) => a.type === 'status_change').length, icon: Zap },
              { key: 'followups', label: 'Follow-Ups', count: activities.filter((a: any) => a.type === 'followup' || a.type === 'schedule' || a.content?.toLowerCase().includes('follow-up')).length, icon: Clock },
              { key: 'notes', label: 'Notes', count: activities.filter((a: any) => a.type === 'note' || a.metadata?.note || a.content?.toLowerCase().includes('note')).length, icon: StickyNote },
              { key: 'system', label: 'System', count: activities.filter((a: any) => a.type === 'system' || a.type === 'assignment_change').length, icon: ShieldCheck },
            ].map((chip) => {
              const Icon = chip.icon;
              const isActive = timelineFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setTimelineFilter(chip.key as any)}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${isActive
                    ? 'btn-blue-45 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-dark-700'
                    }`}
                >
                  {Icon && <Icon className="h-3 w-3 opacity-70" />}
                  <span>{chip.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-dark-700 text-slate-600 dark:text-dark-300'}`}>
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Activity Cards List */}
          {(() => {
            const filteredActivities = activities.filter((act: any) => {
              if (timelineFilter === 'all') return true;
              if (timelineFilter === 'calls') return act.type === 'call' || act.type === 'phone' || act.metadata?.source === 'android_sim_sync' || act.content?.includes('SIM Call');
              if (timelineFilter === 'stages') return act.type === 'status_change';
              if (timelineFilter === 'followups') return act.type === 'followup' || act.type === 'schedule' || act.content?.toLowerCase().includes('follow-up');
              if (timelineFilter === 'notes') return act.type === 'note' || act.metadata?.note || act.content?.toLowerCase().includes('note');
              if (timelineFilter === 'system') return act.type === 'system' || act.type === 'assignment_change';
              return true;
            });

            if (filteredActivities.length === 0) {
              return (
                <div className="py-12 text-center text-xs text-slate-400">
                  No events found for this filter.
                </div>
              );
            }

            return (
              <div className="space-y-3.5">
                {filteredActivities.map((act: any) => {
                  const callOutcomeInfo = getCallOutcomeFromActivity(act);
                  const isSIMCall = act.metadata?.source === 'android_sim_sync' || act.content?.includes('SIM Call') || act.content?.includes('Android SIM');
                  const author = act.userId ? `${act.userId.firstName} ${act.userId.lastName}` : 'System';

                  // Tag type badge config
                  const getEventBadge = () => {
                    if (act.type === 'status_change') {
                      return { label: 'STAGE DISPATCHED', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
                    }
                    if (act.type === 'call' || act.type === 'phone' || isSIMCall) {
                      return { label: 'SIM CALL', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
                    }
                    if (act.type === 'note' || act.metadata?.note) {
                      return { label: 'NOTE', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
                    }
                    if (act.type === 'followup' || act.content?.toLowerCase().includes('follow-up')) {
                      return { label: 'FOLLOW-UP', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
                    }
                    if (act.type === 'email') {
                      return { label: 'EMAIL', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
                    }
                    if (act.type === 'whatsapp') {
                      return { label: 'WHATSAPP', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
                    }
                    return { label: 'SYSTEM EVENT', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
                  };

                  const badge = getEventBadge();

                  // Extract stage transition sub-line (e.g. Follow-up -> Open)
                  const stageMatch = act.content?.match(/dispatched from "(.*?)" to "(.*?)"/i) || act.content?.match(/transitioned from "(.*?)" to "(.*?)"/i);
                  const stageTransition = stageMatch ? `${stageMatch[1]} → ${stageMatch[2]}` : null;

                  return (
                    <div
                      key={act._id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 space-y-2.5 transition hover:shadow-2xs"
                    >
                      {/* Event Header: Type Badge, User attribution, Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            👤 {author}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          🕒 {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>

                      {/* Stage Transition highlight line */}
                      {stageTransition && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold">
                            {stageTransition}
                          </span>
                        </div>
                      )}

                      {/* CALL OUTCOME TAG BADGE */}
                      {callOutcomeInfo && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Call Outcome Tag:
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border shadow-xs ${callOutcomeInfo.color}`}>
                            {callOutcomeInfo.tag}
                          </span>
                          {act.metadata?.duration !== undefined && (
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-dark-300 bg-slate-200/60 dark:bg-dark-700/60 px-2 py-0.5 rounded-lg">
                              Duration: {act.metadata.duration}s
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-slate-700 dark:text-dark-200 leading-relaxed whitespace-pre-line font-sans text-xs">
                        {act.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: QUOTATIONS & BILLING */}
      {activeTab === 'quotations' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Linked Quotations & Deal Proposals</h2>
            <Link
              to={`/accounting/quotations/new?leadId=${lead._id}`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl btn-tri-45 font-bold text-xs active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Quotation</span>
            </Link>
          </div>

          {quotations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-bold">No Quotations Created</p>
              <p>Create a proposal with line items to enable lead conversion.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotations.map((q: any) => (
                <div key={q._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/40 border border-slate-200 dark:border-dark-700 flex items-center justify-between text-xs">
                  <div>
                    <Link to={`/accounting/quotations/${q._id}`} className="font-bold text-primary-600 hover:underline">
                      Quotation #{q.quotationId}
                    </Link>
                    <p className="text-slate-500 mt-0.5">{q.items?.length} items • Total: <strong>₹{q.totalAmount.toLocaleString('en-IN')}</strong></p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-dark-700 dark:text-dark-300 text-[10px] font-bold uppercase">
                      {q.status}
                    </span>
                    <Link to={`/accounting/quotations/${q._id}`} className="p-2 rounded-lg bg-white dark:bg-dark-900 border text-slate-600">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNMENT HISTORY */}
      {activeTab === 'assignment' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800 dark:text-white">Assignment Audit Trail</h2>
          {assignmentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No reassignment history recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-dark-800 text-xs">
              {assignmentLogs.map((log: any) => (
                <div key={log._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {log.fromUserId ? (
                        <p className="font-bold text-slate-800 dark:text-white flex items-center flex-wrap gap-1">
                          <span className="text-slate-400 font-semibold text-[11px]">Previous Rep:</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-dark-200">
                            {log.fromUserId.firstName} {log.fromUserId.lastName}
                          </span>
                          <span className="text-primary-600 font-black mx-1">→</span>
                          <span className="text-slate-400 font-semibold text-[11px]">New Assignee:</span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                            {log.toUserId ? `${log.toUserId.firstName} ${log.toUserId.lastName}` : 'Unassigned'}
                          </span>
                        </p>
                      ) : (
                        <p className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                          <span className="text-slate-400 font-semibold text-[11px]">Initial Assignment:</span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold">
                            {log.toUserId ? `${log.toUserId.firstName} ${log.toUserId.lastName}` : 'Unassigned'}
                          </span>
                        </p>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {log.assignedBy ? `Assigned by ${log.assignedBy.firstName} ${log.assignedBy.lastName} • ` : ''}
                      Reason: <span className="text-slate-600 dark:text-dark-300 font-medium">{log.reason}</span> {log.ruleApplied ? `(Rule: ${log.ruleApplied})` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap self-start sm:self-center">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCHEDULED REMINDERS */}
      {activeTab === 'schedule' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-dark-800 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span>Scheduled Reminders & Follow-Ups ({leadFollowups.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Timeline of upcoming calls, meetings, and outreach tasks for this lead.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenScheduleModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-500/20 active:scale-95"
            >
              <Calendar className="h-4 w-4" />
              <span>Reschedule / New Follow-Up</span>
            </button>
          </div>

          {leadFollowups.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-3">
              <Bell className="h-10 w-10 text-slate-300 dark:text-dark-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No Scheduled Follow-Ups</p>
              <p className="max-w-md mx-auto text-slate-400">
                There are no upcoming follow-up tasks currently active for this lead. Click below to reschedule or set the next outreach date.
              </p>
              <button
                type="button"
                onClick={handleOpenScheduleModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md shadow-purple-500/20 active:scale-95"
              >
                <Calendar className="h-4 w-4" />
                <span>Reschedule Follow-Up</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {leadFollowups.map((item: any) => {
                const isPending = item.status === 'pending';
                return (
                  <div
                    key={item._id}
                    className={`p-4 rounded-2xl border transition text-xs space-y-3 ${isPending
                      ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/50'
                      : 'bg-slate-50 dark:bg-dark-800/40 border-slate-200/70 dark:border-dark-700/60 opacity-80'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`p-2 rounded-xl font-bold ${item.channel === 'whatsapp'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : item.channel === 'email'
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                        >
                          {item.channel === 'whatsapp' ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : item.channel === 'email' ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {item.purpose || 'Follow-Up'}
                          </p>
                          <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold flex items-center space-x-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(item.date).toLocaleDateString('en-IN')} at{' '}
                              <strong className="underline">{item.time || '11:00 AM'}</strong>
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${item.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteFollowUpMutation.mutate(item._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Follow-up"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-slate-600 dark:text-dark-300 bg-white dark:bg-dark-900 p-2.5 rounded-xl border border-slate-100 dark:border-dark-800 text-[11px] leading-relaxed">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-purple-100 dark:border-purple-900/30">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Assigned to: {item.assignedTo ? `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}` : 'Sales Rep'}
                      </span>
                      {isPending && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={handleOpenScheduleModal}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px] transition"
                          >
                            <Calendar className="h-3 w-3" />
                            <span>Reschedule</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateFollowUpStatusMutation.mutate({
                                followupId: item._id,
                                status: 'completed',
                                outcome: 'Completed on schedule'
                              })
                            }
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-sm"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Mark Done</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2.5 Reschedule Follow-Up Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-dark-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-dark-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Reschedule Follow-Up
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lead.name} • <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.phone}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current schedule info if exists */}
            {lead.nextFollowUp && (
              <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-200">
                  <Clock className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-bold">Current Schedule:</span>{' '}
                    <span>{new Date(lead.nextFollowUp).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                  Active
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!followupDate) {
                  alert('Please choose a valid follow-up date.');
                  return;
                }
                createFollowUpMutation.mutate({
                  leadId: id,
                  date: followupDate,
                  time: followupTime,
                  channel: followupChannel,
                  priority: followupPriority,
                  purpose: followupPurpose,
                  notes: followupNotes
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Date & Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Follow-Up Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setFollowupDate(getTodayDate())}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${followupDate === getTodayDate()
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowupDate(getTomorrowDate())}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${followupDate === getTomorrowDate()
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowupDate(getInDaysDate(2))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${followupDate === getInDaysDate(2)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowupDate(getInDaysDate(7))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${followupDate === getInDaysDate(7)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                      +1 Week
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                />
              </div>

              {/* Scheduled Time & Quick Chips */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Scheduled Time <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFollowupTime(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${followupTime === t
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11:00 AM"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Channel & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Channel <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={followupChannel}
                    onChange={(e) => setFollowupChannel(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="phone">📞 Phone Call</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="email">✉️ Email</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={followupPriority}
                    onChange={(e) => setFollowupPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">🔥 Urgent</option>
                  </select>
                </div>
              </div>

              {/* Purpose / Objective */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Follow-Up Purpose / Objective <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1">
                  {['Proposal Follow-Up', 'Quotation Review', 'Payment Discussion', 'Document Collection', 'Requirement Finalization'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFollowupPurpose(p)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${followupPurpose === p
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Proposal Follow-Up, Quotation Review..."
                  value={followupPurpose}
                  onChange={(e) => setFollowupPurpose(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Notes / Agenda */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Talking Points / Follow-Up Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter key discussion items or special instructions for the executive..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-dark-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFollowUpMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5 disabled:opacity-50 active:scale-95"
                >
                  {createFollowUpMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      <span>Confirm & Reschedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Call Log Modal (Triggered on call end) */}
      {showCallLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Log Completed Call Follow-Up</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {lead.name} • <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{lead.phone}</span> • Duration: <span className="font-bold text-slate-700 dark:text-slate-200">{callDuration}s</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCallLogModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 1. Call Outcome Tag * */}
              <div>
                <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                  Call Outcome Tag *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { tag: 'No Answer', label: '❌ No Answer', desc: 'No pickup, rang full', color: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' },
                    { tag: 'Busy', label: '📵 Busy', desc: 'Line busy / rejected', color: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
                    { tag: 'Switched Off', label: '📴 Switched Off', desc: 'Unreachable / off', color: 'border-slate-300 text-slate-700 bg-slate-100 dark:bg-dark-800 dark:text-slate-300' },
                    { tag: 'Call Back Later', label: '⏱️ Call Back Later', desc: 'Client requested callback', color: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300' },
                    { tag: 'Interested', label: '👍 Connected & Interested', desc: 'Positive discussion', color: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
                    { tag: 'Not Interested', label: '🚫 Not Interested', desc: 'Dropped requirement', color: 'border-zinc-300 text-zinc-700 bg-zinc-100 dark:bg-dark-800 dark:text-zinc-300' },
                    { tag: 'Wrong Number', label: '⚠️ Wrong Number', desc: 'Invalid contact', color: 'border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300' },
                    { tag: 'Converted', label: '🤝 Converted / Won', desc: 'Deal closed', color: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300' }
                  ].map((item) => {
                    const isSelected = callOutcome === item.tag;
                    return (
                      <button
                        type="button"
                        key={item.tag}
                        onClick={() => {
                          setCallOutcome(item.tag);
                          if (!callNotes || callNotes.startsWith('Call outcome: ') || callNotes.includes('No answer') || callNotes.includes('Line busy')) {
                            setCallNotes(item.desc);
                          }
                        }}
                        className={`p-2 rounded-2xl text-left border transition-all text-xs flex flex-col justify-between ${isSelected
                          ? `${item.color} font-bold ring-2 ring-primary-500/50 shadow-xs scale-[1.02]`
                          : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300 hover:bg-slate-50 dark:hover:bg-dark-800/80 opacity-80 hover:opacity-100'
                          }`}
                      >
                        <span className="font-bold text-[11px] truncate">{item.label}</span>
                        <span className="text-[9px] text-slate-400 dark:text-dark-400 truncate mt-0.5">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Schedule Next Follow-Up */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Schedule Next Follow-Up (Retry/Callback)
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFollowupDate(new Date().toISOString().split('T')[0]);
                      setFollowupTime('04:00 PM');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                  >
                    ⚡ Today 4:00 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      setFollowupDate(tm.toISOString().split('T')[0]);
                      setFollowupTime('11:00 AM');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
                  >
                    ⚡ Tomorrow 11:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d2 = new Date();
                      d2.setDate(d2.getDate() + 2);
                      setFollowupDate(d2.toISOString().split('T')[0]);
                      setFollowupTime('11:00 AM');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
                  >
                    ⚡ In 2 Days
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Date</label>
                    <input
                      type="date"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-slate-800 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Time</label>
                    <select
                      value={followupTime}
                      onChange={(e) => setFollowupTime(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-slate-800 dark:text-white text-xs outline-none"
                    >
                      {['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Review Notes */}
              <div>
                <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Client Review Notes & Key Discussion *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Key discussion points, objections, next steps..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none font-sans leading-relaxed text-xs focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setShowCallLogModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold text-xs transition"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={!callNotes.trim() || logCallMutation.isPending}
                onClick={() => logCallMutation.mutate()}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl btn-tri-45 font-bold text-xs shadow-md disabled:opacity-50 transition active:scale-95"
              >
                {logCallMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Call Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Status Transition / Position Dispatch Modal */}
      {statusModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-2xl ${statusModal.targetStatus === 'New' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                statusModal.targetStatus === 'Open' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                  statusModal.targetStatus === 'Converted' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' :
                    'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                }`}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Dispatch Position: {statusModal.targetStatus}
                </h3>
                <p className="text-xs text-slate-400">
                  Current Status: <span className="font-bold text-slate-700 dark:text-dark-200">{lead.status}</span>
                </p>
              </div>
            </div>

            {statusModal.targetStatus === 'New' && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                <p className="font-bold">Resetting lead to Fresh Inquiry (New)</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  This will move the lead to the initial qualification queue and clear any previous closed records.
                </p>
              </div>
            )}

            {statusModal.targetStatus === 'Open' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <p className="font-bold">Moving lead to Active Pipeline (Open)</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  The lead will be active for regular follow-ups, calls, quotations, and deal progress.
                </p>
              </div>
            )}

            {statusModal.targetStatus === 'Lost' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Reason for Loss * (Mandatory)</label>
                  <select
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  >
                    <option value="Price">Price / Budget Constraint</option>
                    <option value="No Response">No Response / Unreachable</option>
                    <option value="Competitor">Chose Competitor</option>
                    <option value="Not Interested">Not Interested in Service</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Loss Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Specific feedback or loss explanation..."
                    value={lostNotes}
                    onChange={(e) => setLostNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
              </div>
            )}

            {statusModal.targetStatus === 'Converted' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-800 dark:text-purple-300">
                  <p className="font-bold">Converting to Paying Customer</p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">
                    Converting this lead marks it as a successfully won customer account. Payment expected amount is mandatory.
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-white">
                      Payment Expected (₹) <span className="text-red-500">* (Mandatory)</span>
                    </label>
                    {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        🔒 Admin Locked
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    disabled={!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0}
                    placeholder="e.g. 50000"
                    value={statusModalPaymentExpected}
                    onChange={(e) => setStatusModalPaymentExpected(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-mono font-semibold ${!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0
                      ? 'bg-slate-100 dark:bg-dark-900 text-slate-400 cursor-not-allowed select-none'
                      : 'bg-slate-50 dark:bg-dark-800 outline-none'
                      }`}
                  />
                  {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">Payment expected was already filled and can only be modified by Admins.</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">
                    Initial Payment Received (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 if none received yet"
                    value={statusModalPaymentReceived}
                    onChange={(e) => setStatusModalPaymentReceived(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Admin Override Reason (Optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. Direct deal confirmed by management"
                    value={adminOverrideReason}
                    onChange={(e) => setAdminOverrideReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3">
              <button onClick={() => setStatusModal({ open: false, targetStatus: '' })} className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs">
                Cancel
              </button>
              <button
                disabled={updateStatusMutation.isPending}
                onClick={() => {
                  if (statusModal.targetStatus === 'Converted' && lead.status !== 'Converted') {
                    const exp = Number(statusModalPaymentExpected);
                    if (isNaN(exp) || exp <= 0) {
                      alert('Payment Expected amount is required to convert a lead.');
                      return;
                    }
                  }
                  updateStatusMutation.mutate({
                    status: statusModal.targetStatus,
                    lostReason: statusModal.targetStatus === 'Lost' ? lostReason : undefined,
                    lostNotes: statusModal.targetStatus === 'Lost' ? lostNotes : undefined,
                    paymentExpected: statusModal.targetStatus === 'Converted' ? Number(statusModalPaymentExpected) : undefined,
                    paymentReceived: statusModal.targetStatus === 'Converted' ? Number(statusModalPaymentReceived || 0) : undefined,
                    adminOverrideReason: statusModal.targetStatus === 'Converted' ? (adminOverrideReason || 'Admin Direct Dispatch') : undefined
                  });
                }}
                className="px-5 py-2 rounded-xl btn-tri-45 text-white font-bold text-xs disabled:opacity-50 transition shadow-md active:scale-95"
              >
                {updateStatusMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reopen Closed Lead Modal */}
      {reopenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-white">Reopen Lead</h3>
            <p className="text-xs text-slate-400">Provide an audit reason for reopening this closed lead:</p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Client re-contacted with renewed budget..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs outline-none"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setReopenModal(false)} className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs">
                Cancel
              </button>
              <button
                disabled={!reopenReason.trim() || reopenMutation.isPending}
                onClick={() => reopenMutation.mutate()}
                className="px-5 py-2 rounded-xl btn-tri-45 text-white font-bold text-xs disabled:opacity-50 active:scale-95"
              >
                Reopen Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. WhatsApp Modal */}
      {activeActionModal === 'whatsapp' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              <span>WhatsApp Launcher</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Template</label>
                <select
                  value={waTemplate}
                  onChange={(e) => {
                    setWaTemplate(e.target.value);
                    setWaCustomMessage(WA_TEMPLATES[e.target.value].text(lead.name, lead.serviceInterested));
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                >
                  {Object.entries(WA_TEMPLATES).map(([key, val]) => (
                    <option key={key} value={key}>{val.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Message</label>
                <textarea
                  rows={4}
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button onClick={() => setActiveActionModal(null)} className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs">Cancel</button>
              <button onClick={handleLaunchWhatsApp} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md">Open WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Email Modal */}
      {activeActionModal === 'email' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <span>Compose Email</span>
              </h3>
              <button
                onClick={() => { setActiveActionModal(null); setEmailErrorMsg(null); setEmailSuccessMsg(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {emailSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {emailErrorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center space-x-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{emailErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">To</label>
                <input
                  type="text"
                  disabled
                  value={lead?.email || ''}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 font-medium outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Body</label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type email body here..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                onClick={() => { setActiveActionModal(null); setEmailErrorMsg(null); setEmailSuccessMsg(null); }}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                disabled={sendEmailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}
                onClick={() => {
                  setEmailErrorMsg(null);
                  sendEmailMutation.mutate({
                    to: lead.email,
                    subject: emailSubject,
                    text: emailBody,
                    leadId: lead._id || lead.id || id
                  });
                }}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending Directly...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send via Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Admin / Manager Edit Lead Information Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    Edit Lead Information
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lead #{lead?.leadId} &bull; Update contact details, assignment & priority
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLeadInfoMutation.mutate(editForm);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={editForm.whatsApp}
                    onChange={(e) => setEditForm({ ...editForm, whatsApp: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={editForm.alternatePhone}
                    onChange={(e) => setEditForm({ ...editForm, alternatePhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Lead Source</label>
                  <select
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="Website">Website</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="JustDial">JustDial</option>
                    <option value="IndiaMART">IndiaMART</option>
                    <option value="Referral">Referral</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Service / Product Interested */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Service Interested</label>
                  <input
                    type="text"
                    value={editForm.serviceInterested}
                    onChange={(e) => setEditForm({ ...editForm, serviceInterested: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Expected Deal Value / Payment Expected */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-dark-200">Payment Expected (₹)</label>
                    {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        🔒 Admin Locked
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    disabled={!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0}
                    value={editForm.expectedValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditForm({ ...editForm, expectedValue: val, paymentExpected: val });
                    }}
                    className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-mono ${!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0
                      ? 'bg-slate-100 dark:bg-dark-900 text-slate-400 cursor-not-allowed select-none'
                      : 'bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none'
                      }`}
                  />
                  {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">Once filled, Payment Expected can only be edited by Admins.</p>
                  )}
                </div>

                {/* Payment Received / Completed */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Payment Received / Completed (₹)</label>
                  <input
                    type="number"
                    value={editForm.paymentReceived}
                    onChange={(e) => setEditForm({ ...editForm, paymentReceived: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500 font-mono text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                {/* Assigned Team Member */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Assigned Sales Executive / Employee</label>
                  <select
                    value={editForm.assignedTo}
                    onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">-- Unassigned (General Pool) --</option>
                    {(repsData || []).map((rep: any) => (
                      <option key={rep.user._id || rep.user.id} value={rep.user._id || rep.user.id}>
                        {rep.user.firstName} {rep.user.lastName} ({rep.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-dark-200 mb-1">Lead Notes / Remarks</label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Enter notes, customer requirements, or follow-up insights..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-bold text-slate-600 dark:text-dark-300 hover:bg-slate-50 dark:hover:bg-dark-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLeadInfoMutation.isPending}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl btn-tri-45 text-white font-bold transition shadow-md disabled:opacity-50 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateLeadInfoMutation.isPending ? 'Saving Updates...' : 'Save Lead Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Note Modal (Matching Screenshot 2) */}
      {showQuickNoteModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowQuickNoteModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-dark-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-dark-700 p-6 space-y-4 animate-in zoom-in-95 duration-150 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                  <StickyNote className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Add Quick Note
                  </h3>
                  <p className="text-xs text-slate-400">Record insights, meeting takeaways or customer updates for {lead?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickNoteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">Note Category</label>
                <select
                  value={quickNoteCategory}
                  onChange={(e) => setQuickNoteCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold text-slate-800 dark:text-white outline-none"
                >
                  <option value="General Note">📝 General Note</option>
                  <option value="Call Insight">📞 Call Insight</option>
                  <option value="Requirement Update">💼 Requirement Update</option>
                  <option value="Pricing / Budget">💰 Pricing / Budget</option>
                  <option value="Urgent Attention">⚠️ Urgent Attention</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">Note Details</label>
                <textarea
                  autoFocus
                  rows={4}
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Type your notes here..."
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setShowQuickNoteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!quickNoteText.trim() || addNoteMutation.isPending}
                onClick={() => {
                  if (quickNoteText.trim()) {
                    addNoteMutation.mutate({
                      note: `[${quickNoteCategory}] ${quickNoteText.trim()}`
                    });
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{addNoteMutation.isPending ? 'Saving...' : 'Save Quick Note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Employee Payment Edit Modal (Any employee can enter/edit payment details anytime) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Update Payment Details</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {lead.name} • #{lead.leadId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const exp = Number(paymentExpectedInput);
                const rec = Number(paymentReceivedInput);
                if (isNaN(exp) || exp < 0) {
                  alert('Please enter a valid Payment Expected amount.');
                  return;
                }
                if (isNaN(rec) || rec < 0) {
                  alert('Please enter a valid Payment Received amount.');
                  return;
                }
                updatePaymentMutation.mutate({
                  paymentExpected: exp,
                  paymentReceived: rec,
                  transitionNotes: paymentUpdateNotes.trim() || undefined
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-200">
                    Payment Expected (₹) <span className="text-red-500">*</span>
                  </label>
                  {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      🔒 Admin Locked
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  disabled={!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0}
                  placeholder="Total amount expected from client"
                  value={paymentExpectedInput}
                  onChange={(e) => setPaymentExpectedInput(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-mono font-semibold ${!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0
                    ? 'bg-slate-100 dark:bg-dark-900 text-slate-400 cursor-not-allowed select-none'
                    : 'bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'
                    }`}
                />
                {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Once filled, Payment Expected cannot be edited by employees. Only Admins can modify Expected Payment.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isAdmin ? 'Admins can edit both Expected and Received payment amounts.' : 'Enter the expected deal value once.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Payment Received / Completed (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Amount received so far (₹)"
                  value={paymentReceivedInput}
                  onChange={(e) => setPaymentReceivedInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Employees can update this anytime when payments are received or adjusted.
                </p>
              </div>

              {/* Dynamic Due preview */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">Remaining Balance (Due):</span>
                <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                  ₹{Math.max(0, (Number(paymentExpectedInput) || 0) - (Number(paymentReceivedInput) || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Update Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via UPI / NEFT transaction ref #12345"
                  value={paymentUpdateNotes}
                  onChange={(e) => setPaymentUpdateNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePaymentMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-md disabled:opacity-50 transition active:scale-95 cursor-pointer"
                >
                  {updatePaymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Conversion Requirement Modal (Mandatory Payment Expected when converting) */}
      {conversionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Convert Lead to Won</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Moving to {conversionModal.targetSubStage || conversionModal.targetStatus}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConversionModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs text-purple-800 dark:text-purple-300">
              <p className="font-bold">Conversion Commercial Requirement</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">
                Entering the Payment Expected amount is mandatory when converting a lead into the converted pipeline.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const exp = Number(conversionExpectedInput);
                const rec = Number(conversionReceivedInput || 0);
                if (isNaN(exp) || exp <= 0) {
                  alert('Please enter a valid Payment Expected amount greater than 0.');
                  return;
                }
                const due = Math.max(0, exp - rec);
                if (conversionModal.targetSubStage === 'Invoiced' && due > 0) {
                  alert(`Cannot move lead to Invoiced: Outstanding payment due is ₹${due.toLocaleString('en-IN')}. Payment due must be ₹0 or less before moving to Invoiced.`);
                  return;
                }
                quickDispatchMutation.mutate({
                  leadId: lead._id || lead.id || id,
                  status: conversionModal.targetStatus,
                  subStage: conversionModal.targetSubStage,
                  paymentExpected: exp,
                  paymentReceived: rec,
                  transitionNotes: conversionNotesInput.trim() || undefined
                });
                setConversionModal(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-200">
                    Payment Expected (₹) <span className="text-red-500">* (Mandatory)</span>
                  </label>
                  {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      🔒 Admin Locked
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  disabled={!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0}
                  placeholder="e.g. 50000"
                  value={conversionExpectedInput}
                  onChange={(e) => setConversionExpectedInput(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 font-mono font-semibold ${!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0
                    ? 'bg-slate-100 dark:bg-dark-900 text-slate-400 cursor-not-allowed select-none'
                    : 'bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none'
                    }`}
                />
                {!isAdmin && Number(lead?.paymentExpected ?? lead?.expectedValue ?? 0) > 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">Payment Expected was already filled and can only be modified by Admins.</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Initial Payment Received (₹) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0 if payment is pending"
                  value={conversionReceivedInput}
                  onChange={(e) => setConversionReceivedInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Conversion Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Direct customer confirmation"
                  value={conversionNotesInput}
                  onChange={(e) => setConversionNotesInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setConversionModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickDispatchMutation.isPending}
                  className="px-5 py-2.5 rounded-xl btn-green-45 text-white font-bold shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Confirm Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
