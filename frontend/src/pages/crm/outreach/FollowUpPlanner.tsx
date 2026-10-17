import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { 
  Calendar, Phone, Mail, MessageSquare, Plus, 
  CheckCircle2, AlertCircle, X, 
  ExternalLink, Send, RefreshCw, Search,
  Clock, PhoneCall,
  Users, Sparkles, Flame, Trophy, XCircle,
  Copy, Check, Zap, Eye, GitBranch, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const FollowUpPlanner: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (user?.email === 'shivamthakur12012@gmail.com' ? 'Admin' : 'Sale Executive');
  const isPrivileged = ['Admin', 'Super Admin', 'Manager', 'Team Leader'].includes(activeRole) || user?.email === 'shivamthakur12012@gmail.com';

  // Filter States
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Fetch lead pipeline counts for parent bar
  const { data: leadsResponse } = useQuery({
    queryKey: ['leads-pipeline-counts'],
    queryFn: async () => {
      try {
        const res = await api.get('/leads', { params: { limit: 1 } });
        return res.data.data?.counts || { all: 0, today: 0, open: 0, converted: 0, lost: 0 };
      } catch (e) {
        return { all: 0, today: 0, open: 0, converted: 0, lost: 0 };
      }
    },
    staleTime: 60 * 1000
  });
  const leadCounts = leadsResponse || { all: 0, today: 0, open: 0, converted: 0, lost: 0 };

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [activeActionModal, setActiveActionModal] = useState<'whatsapp' | 'email' | 'phone' | null>(null);
  const [rescheduleModalItem, setRescheduleModalItem] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('11:00 AM');

  // New FollowUp Form state
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [followupChannel, setFollowupChannel] = useState<'whatsapp' | 'email' | 'phone'>('whatsapp');
  const [followupPriority, setFollowupPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [followupPurpose, setFollowupPurpose] = useState('Quotation Follow-up');
  const [followupDate, setFollowupDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [followupTime, setFollowupTime] = useState('11:30 AM');
  const [followupNotes, setFollowupNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetScheduleForm = () => {
    setSelectedLeadId('');
    setFollowupChannel('whatsapp');
    setFollowupPriority('high');
    setFollowupPurpose('Quotation Follow-up');
    const today = new Date();
    setFollowupDate(today.toISOString().split('T')[0]);
    setFollowupTime('11:30 AM');
    setFollowupNotes('');
    setFormError(null);
  };

  // WhatsApp Action Modal state
  const [waTemplate, setWaTemplate] = useState('quotation_followup');
  const [waCustomMessage, setWaCustomMessage] = useState('');

  // Email Action Modal state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Phone Call Outcome Modal state
  const [callOutcome, setCallOutcome] = useState('Connected');
  const [callDuration, setCallDuration] = useState('60');
  const [callNotes, setCallNotes] = useState('');

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // 1. Fetch FollowUps & Global Stats
  const { data: followupsResponse, isLoading: isFollowupsLoading, isFetching, refetch } = useQuery({
    queryKey: ['followups-planner', channelFilter, periodFilter, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (channelFilter !== 'all') params.channel = channelFilter;
      if (periodFilter !== 'all') params.period = periodFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/outreach/followups', { params });
      return res.data;
    },
    placeholderData: (previousData) => previousData
  });

  const rawFollowups: any[] = followupsResponse?.data || [];
  const stats = followupsResponse?.stats || {
    total: 0,
    whatsapp: 0,
    email: 0,
    phone: 0,
    pending: 0,
    completed: 0,
    todayDue: 0,
    overdue: 0
  };

  // 2. Fetch Leads for dropdown
  const { data: leadsData } = useQuery({
    queryKey: ['leads-dropdown'],
    queryFn: async () => {
      const res = await api.get('/leads', { params: { limit: 100 } });
      return res.data.data?.leads || res.data.data || [];
    }
  });

  // Helper to extract clean contact info regardless of lead/customer/channelDetails origin
  const getContactInfo = (item: any) => {
    const lead = item?.leadId;
    const customer = item?.customerId;
    const details = item?.channelDetails || {};

    let contactName = lead?.name || customer?.name || customer?.companyName || details.contactName;
    if (!contactName && item?.purpose && item.purpose.includes('—')) {
      const parts = item.purpose.split('—');
      contactName = parts[1]?.split('[')[0]?.trim();
    }
    contactName = contactName || 'Client Contact';

    const phone = lead?.whatsApp || lead?.phone || customer?.phone || details.phoneNumber || '';
    const email = lead?.email || customer?.email || details.email || '';
    const service = lead?.serviceInterested || customer?.serviceInterested || 'Consultancy Services';
    const isMatched = Boolean(lead?._id || lead?.id || customer?._id || customer?.id);

    return { contactName, phone, email, service, lead, customer, details, isMatched };
  };

  // Client-side search & match filtering
  const followupsData = useMemo(() => {
    // Only keep matched contacts (filter out orphan/spam/un-matched SIM calls)
    const matchedOnly = rawFollowups.filter((item: any) => {
      const isSimCall = item?.purpose && /SIM Call/i.test(item.purpose);
      if (isSimCall) {
        return Boolean(item?.leadId || item?.customerId || item?.lead || item?.customer);
      }
      return true;
    });

    if (!searchQuery.trim()) return matchedOnly;
    const q = searchQuery.toLowerCase().trim();
    return matchedOnly.filter((item: any) => {
      const { contactName, phone, email } = getContactInfo(item);
      const purpose = (item.purpose || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();

      return contactName.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        purpose.includes(q) ||
        notes.includes(q);
    });
  }, [rawFollowups, searchQuery]);

  // Status & Urgency Calculator for follow-up card
  const getFollowUpStatus = (item: any) => {
    if (item.status === 'completed') {
      return {
        type: 'completed',
        label: 'Completed',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
        borderClass: 'border-emerald-200/70 dark:border-emerald-900/40'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return {
        type: 'overdue',
        label: diffDays === 1 ? 'Overdue (1 day)' : `Overdue (${diffDays} days)`,
        badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse',
        borderClass: 'border-rose-300/80 dark:border-rose-900/70 shadow-rose-500/5'
      };
    }

    if (diffDays === 0) {
      return {
        type: 'today',
        label: 'Due Today',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 ring-1 ring-amber-400/40',
        borderClass: 'border-amber-300/80 dark:border-amber-900/70 shadow-amber-500/5'
      };
    }

    return {
      type: 'upcoming',
      label: 'Upcoming',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80',
      borderClass: 'border-slate-200/80 dark:border-dark-800'
    };
  };

  const handleCopyPhone = (phoneStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phoneStr) return;
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhone(phoneStr);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Create FollowUp Mutation
  const createFollowUpMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/followups', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      setShowScheduleModal(false);
      setSelectedLeadId('');
      setFollowupNotes('');
      setFormError(null);
      setActionSuccessMsg('Follow-up scheduled successfully!');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to schedule follow-up.');
    }
  });

  // Update Status / Outcome Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, outcome }: { id: string; status: string; outcome?: string }) => {
      const res = await api.put(`/outreach/followups/${id}`, { status, outcome });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setActiveActionModal(null);
      setSelectedFollowUp(null);
      setActionSuccessMsg('Follow-up updated successfully!');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    }
  });

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      const res = await api.put(`/outreach/followups/${id}`, { date, time, status: 'pending' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setRescheduleModalItem(null);
      setActionSuccessMsg('Follow-up rescheduled successfully!');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    },
    onError: (err: any) => {
      setActionErrorMsg(err.response?.data?.message || 'Failed to reschedule.');
      setTimeout(() => setActionErrorMsg(null), 3000);
    }
  });


  // Dispatch WhatsApp Message Mutation
  const sendWaMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/whatsapp/send', payload);
      return res.data;
    },
    onSuccess: () => {
      if (selectedFollowUp?._id) {
        updateStatusMutation.mutate({
          id: selectedFollowUp._id,
          status: 'completed',
          outcome: 'WhatsApp message sent'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      setActionSuccessMsg('WhatsApp message dispatched & recorded!');
      setTimeout(() => {
        setActionSuccessMsg(null);
        setActiveActionModal(null);
      }, 1800);
    }
  });

  // Dispatch Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/email/send', payload);
      return res.data;
    },
    onSuccess: () => {
      if (selectedFollowUp?._id) {
        updateStatusMutation.mutate({
          id: selectedFollowUp._id,
          status: 'completed',
          outcome: 'Email dispatched'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      setActionSuccessMsg('Email dispatched successfully via MailerCloud!');
      setTimeout(() => {
        setActionSuccessMsg(null);
        setActiveActionModal(null);
      }, 1800);
    },
    onError: (err: any) => {
      setActionErrorMsg(err.response?.data?.message || err.message || 'Failed to dispatch email.');
    }
  });

  // Log Manual Call Mutation
  const logCallMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/calls/manual', payload);
      return res.data;
    },
    onSuccess: () => {
      if (selectedFollowUp?._id) {
        updateStatusMutation.mutate({
          id: selectedFollowUp._id,
          status: 'completed',
          outcome: callOutcome
        });
      }
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      setActiveActionModal(null);
      setActionSuccessMsg('Phone call logged & follow-up marked done!');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    }
  });

  const selectedContactInfo = useMemo(() => {
    if (!selectedFollowUp) return { contactName: 'Contact', phone: '', email: '', service: 'Consultancy Services', lead: null, customer: null };
    return getContactInfo(selectedFollowUp);
  }, [selectedFollowUp]);

  // Standard Templates catalog
  const WA_TEMPLATES: Record<string, { title: string; text: (name: string, service?: string) => string }> = {
    quotation_followup: {
      title: 'Quotation Follow-up & Review',
      text: (name, service) => `Hello ${name}, hope you are doing well. We shared the customized proposal for ${service || 'our advisory services'}. Have you had a chance to review it? Let us know if you need any adjustments or clarification!`
    },
    welcome_intro: {
      title: 'Welcome & Initial Introduction',
      text: (name, service) => `Hi ${name}, thank you for connecting with ArthaVenture regarding ${service || 'business solutions'}. When would be a good time for a quick 5-minute discussion today?`
    },
    document_reminder: {
      title: 'Pending Document Collection',
      text: (name, service) => `Dear ${name}, to proceed with your ${service || 'application'}, please share the required documentation at your earliest convenience. Feel free to send them directly on this chat.`
    },
    meeting_reminder: {
      title: 'Scheduled Call / Discussion Reminder',
      text: (name, service) => `Hi ${name}, this is a gentle reminder regarding our scheduled follow-up discussion today regarding ${service || 'your requirement'}. Looking forward to connecting!`
    },
    payment_reminder: {
      title: 'Invoice / Payment Due Reminder',
      text: (name, service) => `Dear ${name}, this is a gentle reminder that the invoice for ${service || 'consultancy services'} is pending settlement. Please let us know if you need any assistance with payment details.`
    }
  };

  const handleOpenWhatsAppModal = (item: any) => {
    setSelectedFollowUp(item);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    const { contactName, service } = getContactInfo(item);
    setWaTemplate('quotation_followup');
    setWaCustomMessage(WA_TEMPLATES.quotation_followup.text(contactName, service));
    setActiveActionModal('whatsapp');
  };

  const handleTemplateChange = (tmplKey: string) => {
    setWaTemplate(tmplKey);
    const { contactName, service } = getContactInfo(selectedFollowUp);
    if (WA_TEMPLATES[tmplKey]) {
      setWaCustomMessage(WA_TEMPLATES[tmplKey].text(contactName, service));
    }
  };

  const handleOpenEmailModal = (item: any) => {
    setSelectedFollowUp(item);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    const { contactName, service } = getContactInfo(item);
    setEmailSubject(`ArthaVenture Follow-up: ${service} for ${contactName}`);
    setEmailBody(`Dear ${contactName},\n\nThank you for choosing ArthaVenture. We are following up regarding your requirement for ${service}.\n\nPlease let us know if you have any questions or if you would like to schedule a call.\n\nBest regards,\nArthaVenture Team`);
    setActiveActionModal('email');
  };

  const handleOpenCallModal = (item: any) => {
    setSelectedFollowUp(item);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    setCallOutcome('Connected');
    setCallDuration('60');
    setCallNotes(item.notes || '');
    setActiveActionModal('phone');
  };

  const handleOpenRescheduleModal = (item: any) => {
    setRescheduleModalItem(item);
    if (item.date) {
      setRescheduleDate(new Date(item.date).toISOString().split('T')[0]);
    }
    setRescheduleTime(item.time || '11:00 AM');
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    const { phone, lead, customer } = getContactInfo(selectedFollowUp);
    if (!phone) {
      alert('No phone number available for this contact.');
      return;
    }

    sendWaMutation.mutate({
      to: phone,
      customMessage: waCustomMessage,
      templateName: waTemplate,
      leadId: lead?._id || (typeof selectedFollowUp.leadId === 'string' ? selectedFollowUp.leadId : undefined),
      customerId: customer?._id || (typeof selectedFollowUp.customerId === 'string' ? selectedFollowUp.customerId : undefined)
    });
  };

  const handleOpenDirectWhatsAppWeb = () => {
    if (!selectedFollowUp) return;
    const { phone } = getContactInfo(selectedFollowUp);
    const rawPhone = (phone || '').replace(/\D/g, '');
    const phoneWithCountry = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const encoded = encodeURIComponent(waCustomMessage);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
    if (selectedFollowUp._id) {
      updateStatusMutation.mutate({
        id: selectedFollowUp._id,
        status: 'completed',
        outcome: 'Opened via WhatsApp Web'
      });
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    const { email, lead, customer } = getContactInfo(selectedFollowUp);
    if (!email) {
      alert('No email address registered for this contact.');
      return;
    }

    sendEmailMutation.mutate({
      to: email,
      subject: emailSubject,
      text: emailBody,
      leadId: lead?._id || (typeof selectedFollowUp.leadId === 'string' ? selectedFollowUp.leadId : undefined),
      customerId: customer?._id || (typeof selectedFollowUp.customerId === 'string' ? selectedFollowUp.customerId : undefined)
    });
  };

  const handleLogCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    const { phone, lead, customer } = getContactInfo(selectedFollowUp);
    if (!phone) {
      alert('No phone number found.');
      return;
    }

    logCallMutation.mutate({
      leadId: lead?._id || (typeof selectedFollowUp.leadId === 'string' ? selectedFollowUp.leadId : undefined),
      customerId: customer?._id || (typeof selectedFollowUp.customerId === 'string' ? selectedFollowUp.customerId : undefined),
      phoneNumber: phone,
      outcome: callOutcome,
      duration: Number(callDuration) || 0,
      notes: callNotes
    });
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      setFormError('Please select a lead contact.');
      return;
    }
    if (!followupDate) {
      setFormError('Please select a valid follow-up date.');
      return;
    }

    createFollowUpMutation.mutate({
      leadId: selectedLeadId,
      channel: followupChannel,
      priority: followupPriority,
      purpose: followupPurpose,
      date: followupDate,
      time: followupTime || '11:00 AM',
      notes: followupNotes
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* 1. PIPELINE LIFECYCLE FUNNEL & SEGMENTED CONTROLS */}
      <div className="bg-white/95 dark:bg-dark-900/90 border border-slate-200/80 dark:border-dark-800 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xs">
        {/* Sleek 45-degree Brand Gradient Accent Line on Top */}
        <div className="h-[2px] w-full brand-tri-45" />

        <div className="p-3 sm:p-4 space-y-3.5">
          {/* Pipeline Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <GitBranch className="h-3 w-3" />
                <span>Lifecycle Pipeline</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Active View: <strong className="text-slate-800 dark:text-slate-200">Follow-Up Outreach</strong>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span>Total Funnel Leads:</span>
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-dark-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-dark-700">
                  {leadCounts.all ?? 0}
                </span>
              </span>
            </div>
          </div>

          {/* Row 1: Pipeline Stage Tabs (Full-width 6-col grid) */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {/* All Leads */}
            <Link
              to="/crm/leads"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-blue-400/60 dark:hover:border-blue-600/60 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <Users className="h-4 w-4 shrink-0 transition-colors text-blue-500 group-hover:scale-110" />
                <span className="truncate">{isPrivileged ? 'All Leads' : 'My Leads'}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50">
                {leadCounts.all}
              </span>
            </Link>

            {/* New Leads */}
            <Link
              to="/crm/today-leads"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-orange-400/60 dark:hover:border-orange-600/60 hover:text-orange-600 dark:hover:text-orange-400 shadow-2xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className="h-4 w-4 shrink-0 transition-colors text-[#fe7c02] group-hover:scale-110" />
                <span className="truncate">New Leads</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50">
                {leadCounts.today ?? 0}
              </span>
            </Link>

            {/* Open Leads */}
            <Link
              to="/crm/open-leads"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-amber-400/60 dark:hover:border-amber-600/60 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <Flame className="h-4 w-4 shrink-0 transition-colors text-amber-500 group-hover:scale-110" />
                <span className="truncate">Open Leads</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50">
                {leadCounts.open}
              </span>
            </Link>

            {/* Follow-Up (ACTIVE) */}
            <Link
              to="/crm/followups"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer btn-blue-45 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40"
            >
              <div className="flex items-center space-x-2 truncate">
                <Clock className="h-4 w-4 shrink-0 text-white" />
                <span className="truncate">Follow-Up</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 bg-white/20 text-white backdrop-blur-xs border border-white/25">
                {stats.total}
              </span>
            </Link>

            {/* Converted */}
            <Link
              to="/crm/converted-leads"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-emerald-400/60 dark:hover:border-emerald-600/60 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-2xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <Trophy className="h-4 w-4 shrink-0 transition-colors text-[#028825] group-hover:scale-110" />
                <span className="truncate">Converted</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50">
                {leadCounts.converted}
              </span>
            </Link>

            {/* Lost Leads */}
            <Link
              to="/crm/lost-leads"
              className="group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-rose-400/60 dark:hover:border-rose-600/60 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <XCircle className="h-4 w-4 shrink-0 transition-colors text-rose-500 group-hover:scale-110" />
                <span className="truncate">Lost Leads</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50">
                {leadCounts.lost}
              </span>
            </Link>
          </div>

          {/* Row 2: Follow-Up Sub-Pipeline Filter Strip */}
          <div className="pt-2 border-t border-slate-100 dark:border-dark-800/80">
            <div className="bg-slate-50/80 dark:bg-dark-950/70 rounded-xl p-2 sm:p-2.5 border border-slate-200/70 dark:border-dark-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Filter className="h-3.5 w-3.5 text-blue-500" />
                  <span className="uppercase text-[11px] tracking-wider text-slate-500 dark:text-slate-400">
                    Follow-Up Views:
                  </span>
                </div>
              </div>

              <div className="w-full">
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => { setChannelFilter('all'); setPeriodFilter('all'); setStatusFilter('all'); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      channelFilter === 'all' && periodFilter === 'all' && statusFilter === 'all'
                        ? 'btn-blue-45 text-white shadow-xs ring-1 ring-blue-400/30'
                        : 'bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-blue-400/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">All Follow-ups</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                      channelFilter === 'all' && periodFilter === 'all' && statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {stats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPeriodFilter('today'); setChannelFilter('all'); setStatusFilter('all'); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      periodFilter === 'today'
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs ring-1 ring-amber-400/30'
                        : 'bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-amber-400/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Zap className="h-3.5 w-3.5 shrink-0 fill-current" />
                      <span className="truncate">Today Due</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                      periodFilter === 'today' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {stats.todayDue}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStatusFilter('pending'); setPeriodFilter('all'); setChannelFilter('all'); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'btn-blue-45 text-white shadow-xs ring-1 ring-blue-400/30'
                        : 'bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-blue-400/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Pending</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                      statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {stats.pending}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPeriodFilter('overdue'); setChannelFilter('all'); setStatusFilter('all'); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      periodFilter === 'overdue'
                        ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-xs ring-1 ring-rose-400/30'
                        : 'bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-rose-400/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Overdue</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                      periodFilter === 'overdue' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {stats.overdue}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStatusFilter('completed'); setPeriodFilter('all'); setChannelFilter('all'); }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      statusFilter === 'completed'
                        ? 'btn-green-45 text-white shadow-xs ring-1 ring-emerald-400/30'
                        : 'bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-emerald-400/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Completed</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                      statusFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {stats.completed}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS, SEARCH & ACTION BAR */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 p-3 sm:p-3.5 rounded-2xl shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contact, company, phone, purpose or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="phone">📞 Phone Call</option>
              <option value="email">✉️ Email</option>
            </select>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">📅 All Dates</option>
              <option value="today">⚡ Today's Due</option>
              <option value="upcoming">⏳ Upcoming</option>
              <option value="overdue">⚠️ Overdue</option>
            </select>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-dark-700 transition cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={() => { resetScheduleForm(); setShowScheduleModal(true); }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl btn-tri-45 font-bold text-xs shadow-xs hover:shadow transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule Follow-up</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ALERTS */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center space-x-2 text-xs font-bold animate-fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* 4. MAIN FOLLOW-UP LEADS TABLE (MATCHING LEADS LIST) */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200/80 dark:border-dark-800 rounded-2xl p-4 shadow-xs space-y-4">
        {isFollowupsLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-12 bg-slate-100 dark:bg-dark-800/60 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="h-4 w-32 bg-slate-200 dark:bg-dark-700 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-dark-700 rounded"></div>
                <div className="h-4 w-28 bg-slate-200 dark:bg-dark-700 rounded"></div>
                <div className="h-4 w-20 bg-slate-200 dark:bg-dark-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : followupsData.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Calendar className="h-12 w-12 text-slate-300 dark:text-dark-600 mx-auto" />
            <p className="text-base font-bold text-slate-800 dark:text-white">No Follow-ups Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All caught up! No scheduled calls or outreach tasks match your selected filter criteria.
            </p>
            <button
              onClick={() => { resetScheduleForm(); setShowScheduleModal(true); }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule New Follow-up</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 dark:border-dark-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-600 dark:text-dark-300">
              <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase tracking-wider border-b border-slate-200/80 dark:border-dark-700">
                <tr>
                  <th className="p-3 whitespace-nowrap">LEAD ID</th>
                  <th className="p-3 whitespace-nowrap">LEAD DETAILS</th>
                  <th className="p-3 whitespace-nowrap">CONTACT</th>
                  <th className="p-3 whitespace-nowrap">ASSIGNED TO</th>
                  <th className="p-3 whitespace-nowrap">SCHEDULED TIME</th>
                  <th className="p-3 whitespace-nowrap">PURPOSE & NOTES</th>
                  <th className="p-3 text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                {followupsData.map((item: any) => {
                  const { contactName, phone, email, lead, customer } = getContactInfo(item);
                  const channel = item.channel || item.type || 'whatsapp';
                  const isCompleted = item.status === 'completed';
                  const statusInfo = getFollowUpStatus(item);
                  const company = lead?.company || customer?.companyName || '—';
                  const leadId = lead?.leadId || (lead?._id ? lead._id.slice(-6).toUpperCase() : '—');
                  const initials = (contactName || 'Lead')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/30 transition">
                      {/* 1. LEAD ID */}
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {lead?._id ? (
                          <Link to={`/crm/leads/${lead._id}`} className="hover:underline">
                            {leadId}
                          </Link>
                        ) : (
                          <span>{leadId}</span>
                        )}
                      </td>

                      {/* 2. LEAD DETAILS */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border ${
                            statusInfo.type === 'overdue' ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40' :
                            statusInfo.type === 'today' ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40' :
                            statusInfo.type === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40' :
                            'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            {lead?._id ? (
                              <Link to={`/crm/leads/${lead._id}`} className="font-bold text-slate-800 dark:text-white hover:text-blue-600 block truncate max-w-[160px]">
                                {contactName}
                              </Link>
                            ) : (
                              <span className="font-bold text-slate-800 dark:text-white block truncate max-w-[160px]">{contactName}</span>
                            )}
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">{company}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. CONTACT */}
                      <td className="p-3 space-y-0.5 font-mono whitespace-nowrap">
                        <div className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-dark-200 text-xs">
                          <span>{phone || '—'}</span>
                          {phone && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(phone, e)}
                              className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                              title="Copy Phone Number"
                            >
                              {copiedPhone === phone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {email && email !== 'No Email' && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{email}</p>
                        )}
                      </td>

                      {/* 4. ASSIGNED TO */}
                      <td className="p-3 whitespace-nowrap">
                        {lead?.assignedTo ? (
                          <div className="flex items-center space-x-1.5 text-slate-800 dark:text-dark-200 font-medium text-xs">
                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-dark-700 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-600">
                              {typeof lead.assignedTo === 'object' ? (lead.assignedTo.firstName?.[0] || 'U') : 'U'}
                            </div>
                            <span className="truncate max-w-[110px]">{typeof lead.assignedTo === 'object' ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}` : 'Sales Team'}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 font-extrabold text-[10px] tracking-wide uppercase">
                            UNASSIGNED
                          </span>
                        )}
                      </td>

                      {/* 5. SCHEDULED TIME */}
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenRescheduleModal(item)}
                          title="Click to reschedule Follow-up date & time"
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                            statusInfo.type === 'overdue' ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800' :
                            statusInfo.type === 'today' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800' :
                            statusInfo.type === 'completed' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' :
                            'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {item.time || '11:00 AM'}</span>
                        </button>
                      </td>

                      {/* 6. PURPOSE & NOTES */}
                      <td className="p-3 max-w-[200px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1">
                            <span className="capitalize font-bold text-slate-800 dark:text-slate-200 text-xs truncate" title={item.purpose}>
                              {item.purpose || 'Follow-up'}
                            </span>
                            <span className="text-[10px] text-slate-400">({channel})</span>
                          </div>
                          {item.notes ? (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={item.notes}>
                              {item.notes}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No handover note</p>
                          )}
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCallModal(item)}
                            title="Call Lead & Log Outcome"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition hover:scale-110 active:scale-95 shadow-xs cursor-pointer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppModal(item)}
                            title="Send WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEmailModal(item)}
                            title="Send Email"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                          {!isCompleted ? (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: item._id, status: 'completed', outcome: 'Follow-up completed' })}
                              title="Mark Follow-up as Completed"
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: item._id, status: 'pending' })}
                              title="Re-open Follow-up"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-dark-800 dark:text-slate-400 transition cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {lead?._id && (
                            <Link
                              to={`/crm/leads/${lead._id}`}
                              title="View & Audit Lead Details"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 font-semibold text-[11px] transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Details</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: WHATSAPP ACTION MODAL */}
      {activeActionModal === 'whatsapp' && selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Send WhatsApp Follow-up</h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedContactInfo.contactName}
                </span>
                <span className="text-slate-500 dark:text-dark-400 block font-mono text-[11px] mt-0.5">
                  Phone: {selectedContactInfo.phone || 'No phone number available'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-bold text-[10px]">
                WhatsApp Ready
              </span>
            </div>

            <form onSubmit={handleSendWhatsApp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Choose Quick Template
                </label>
                <select
                  value={waTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(WA_TEMPLATES).map(([key, tmpl]) => (
                    <option key={key} value={key}>{tmpl.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Message Preview / Edit
                </label>
                <textarea
                  rows={4}
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl p-3 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleOpenDirectWhatsAppWeb}
                  className="px-3.5 py-2 rounded-xl border border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition flex items-center space-x-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Launch WhatsApp Web/App</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionModal(null)}
                    className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendWaMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{sendWaMutation.isPending ? 'Sending...' : 'Send API'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EMAIL ACTION MODAL */}
      {activeActionModal === 'email' && selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Compose Email Follow-up</h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedContactInfo.contactName}
                </span>
                <span className="text-slate-500 dark:text-dark-400 block font-mono text-[11px] mt-0.5">
                  To: {selectedContactInfo.email || 'No email registered'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 font-bold text-[10px]">
                MailerCloud Verified
              </span>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Email Body *
                </label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl p-3 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendEmailMutation.isPending ? 'Sending...' : 'Send Email Directly'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PHONE CALL OUTCOME MODAL */}
      {activeActionModal === 'phone' && selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <PhoneCall className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Log Phone Call Outcome</h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedContactInfo.contactName}
                </span>
                <span className="text-slate-500 dark:text-dark-400 block font-mono text-[11px] mt-0.5">
                  Phone: {selectedContactInfo.phone || 'No phone number'}
                </span>
              </div>
              {selectedContactInfo.phone && (
                <a
                  href={`tel:${selectedContactInfo.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
                >
                  Dial Now
                </a>
              )}
            </div>

            <form onSubmit={handleLogCall} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Call Outcome
                  </label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Connected">✅ Connected / Interested</option>
                    <option value="Call Back Later">⏳ Call Back Later</option>
                    <option value="No Answer">❌ No Answer / Busy</option>
                    <option value="Converted">🎉 Converted to Customer</option>
                    <option value="Not Interested">🚫 Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Call Summary / Next Steps
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Key discussion points..."
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl p-3 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logCallMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{logCallMutation.isPending ? 'Logging...' : 'Save & Mark Completed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESCHEDULE MODAL */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center space-x-2 text-primary-600">
                <Clock className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Reschedule Follow-up</h3>
              </div>
              <button
                onClick={() => setRescheduleModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                rescheduleMutation.mutate({
                  id: rescheduleModalItem._id,
                  date: rescheduleDate,
                  time: rescheduleTime
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  New Time
                </label>
                <input
                  type="text"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  placeholder="e.g. 03:00 PM"
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalItem(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleMutation.isPending}
                  className="px-4 py-2 rounded-xl btn-tri-45 text-white text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50"
                >
                  {rescheduleMutation.isPending ? 'Saving...' : 'Update Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SCHEDULE NEW FOLLOW-UP */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
                <Calendar className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Schedule New Follow-up</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFollowUp} className="space-y-3">
              {/* Select Lead */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Select Lead / Client Contact *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Choose a contact --</option>
                  {leadsData?.map((l: any) => (
                    <option key={l._id} value={l._id}>
                      {l.name} ({l.phone || l.email || 'Lead'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Channel
                  </label>
                  <select
                    value={followupChannel}
                    onChange={(e: any) => setFollowupChannel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="email">✉️ Email</option>
                    <option value="phone">📞 Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={followupPriority}
                    onChange={(e: any) => setFollowupPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Purpose / Topic
                </label>
                <select
                  value={followupPurpose}
                  onChange={(e) => setFollowupPurpose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                >
                  <option value="Quotation Follow-up">Quotation Follow-up</option>
                  <option value="Document Collection">Document Collection</option>
                  <option value="Requirement Discussion">Requirement Discussion</option>
                  <option value="Payment Reminder">Payment Reminder</option>
                  <option value="Demo Follow-up">Demo Follow-up</option>
                  <option value="General Re-engagement">General Re-engagement</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={followupTime}
                    onChange={(e) => setFollowupTime(e.target.value)}
                    placeholder="e.g. 11:30 AM"
                    className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Key context or specific talking points..."
                  className="w-full bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Form submit */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFollowUpMutation.isPending}
                  className="px-4 py-2 rounded-xl btn-tri-45 text-white text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50"
                >
                  {createFollowUpMutation.isPending ? 'Scheduling...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
