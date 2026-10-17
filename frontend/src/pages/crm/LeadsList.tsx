import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Plus, Search, Users, AlertCircle, Phone,
  MessageSquare, Mail, Send, X,
  ArrowRightLeft, Tag, Trash2, Eye,
  CheckCircle2, Loader2, UserCheck, Clock,
  Sparkles, Flame, Trophy, XCircle, PhoneCall, Check,
  Zap, Target, Handshake, FileText, Receipt,
  GitBranch, Filter
} from 'lucide-react';
import { PipelineStatusDropdown } from '../../components/PipelineStatusDropdown';

interface LeadsListProps {
  defaultMode?: 'all' | 'today' | 'open' | 'followup' | 'converted' | 'lost';
}

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

export const LeadsList: React.FC<LeadsListProps> = ({ defaultMode }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const activeRole = activeOrg?.role || (user?.email === 'shivamthakur12012@gmail.com' ? 'Admin' : 'Sale Executive');
  const isAdmin = ['Admin', 'Super Admin'].includes(activeRole) || user?.email === 'shivamthakur12012@gmail.com';
  const isManager = isAdmin || activeRole === 'Manager';
  const isTeamLeader = isManager || activeRole === 'Team Leader';
  const isPrivileged = isTeamLeader;

  // Detect mode from prop or URL path
  const currentMode = defaultMode || (
    location.pathname.includes('today') ? 'today' :
      location.pathname.includes('open-leads') ? 'open' :
        location.pathname.includes('follow') ? 'followup' :
          location.pathname.includes('converted-leads') ? 'converted' :
            location.pathname.includes('lost-leads') ? 'lost' : 'all'
  );

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [subFilter, setSubFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [targetRepId, setTargetRepId] = useState('');

  // Quick-Add Lead form state
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSource, setNewSource] = useState('Website');
  const [newService, setNewService] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // WhatsApp & Email Quick Dispatch Modal state
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<any>(null);
  const [activeActionModal, setActiveActionModal] = useState<'whatsapp' | 'email' | null>(null);
  const [waTemplate, setWaTemplate] = useState('quotation_followup');
  const [waCustomMessage, setWaCustomMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // Quick Call Outcome & Follow-Up Modal state
  const [callModalLead, setCallModalLead] = useState<any>(null);
  const [callOutcome, setCallOutcome] = useState<string>('No Answer');
  const [callFollowUpDate, setCallFollowUpDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [callFollowUpTime, setCallFollowUpTime] = useState<string>('11:00 AM');
  const [callNotes, setCallNotes] = useState<string>('No answer, rang full.');
  const [autoSendWhatsAppPing, setAutoSendWhatsAppPing] = useState<boolean>(false);
  const [callSuccessFeedback, setCallSuccessFeedback] = useState<string | null>(null);

  // Quick Direct Schedule Follow-Up Modal state
  const [scheduleModalLead, setScheduleModalLead] = useState<any>(null);
  const [directFollowUpDate, setDirectFollowUpDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [directFollowUpTime, setDirectFollowUpTime] = useState<string>('11:00 AM');
  const [directFollowUpPurpose, setDirectFollowUpPurpose] = useState<string>('Follow-up Discussion');
  const [directFollowUpChannel, setDirectFollowUpChannel] = useState<'phone' | 'whatsapp' | 'email'>('phone');
  const [scheduleSuccessFeedback, setScheduleSuccessFeedback] = useState<string | null>(null);

  // Helpers for date presets
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

  const handleOpenCallModal = (lead: any) => {
    setCallModalLead(lead);
    setCallOutcome('No Answer');
    setCallFollowUpDate(getTomorrowDate());
    setCallFollowUpTime('11:00 AM');
    setCallNotes('No answer, rang full.');
    setAutoSendWhatsAppPing(false);
    setCallSuccessFeedback(null);
  };

  const handleOpenScheduleModal = (lead: any) => {
    setScheduleModalLead(lead);
    setDirectFollowUpDate(lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : getTomorrowDate());
    setDirectFollowUpTime('11:00 AM');
    setDirectFollowUpPurpose('Follow-up Discussion');
    setDirectFollowUpChannel('phone');
    setScheduleSuccessFeedback(null);
  };

  // 1. Log Call Outcome & Follow-Up Mutation
  const logCallAndFollowUpMutation = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      phoneNumber: string;
      outcome: string;
      notes: string;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      autoSendWhatsApp?: boolean;
      leadName?: string;
    }) => {
      let nextDateTime: string | undefined = undefined;
      if (payload.nextFollowUpDate) {
        const time24 = convertTimeTo24(payload.nextFollowUpTime || '11:00 AM');
        nextDateTime = `${payload.nextFollowUpDate}T${time24}:00.000Z`;
      }

      await api.post('/outreach/calls/manual', {
        leadId: payload.leadId,
        phoneNumber: payload.phoneNumber,
        direction: 'outbound',
        duration: ['No Answer', 'Busy', 'Switched Off'].includes(payload.outcome) ? 0 : 45,
        outcome: payload.outcome,
        notes: payload.notes || `Call logged with outcome: ${payload.outcome}`,
        nextFollowUpDate: nextDateTime,
        nextFollowUpChannel: 'phone',
        nextFollowUpPurpose: `Follow-up after ${payload.outcome}`
      });

      const leadUpdate: any = {};
      if (nextDateTime) {
        leadUpdate.nextFollowUp = nextDateTime;
      }
      if (payload.outcome === 'Converted') {
        leadUpdate.status = 'Converted';
      }
      if (Object.keys(leadUpdate).length > 0) {
        await api.put(`/leads/${payload.leadId}`, leadUpdate);
      }

      if (payload.autoSendWhatsApp) {
        try {
          const msg = `Hi ${payload.leadName || ''}, tried calling you regarding your inquiry with Artho Vista. Please let us know a suitable time to connect. Thanks!`;
          await api.post('/outreach/whatsapp/send', {
            leadId: payload.leadId,
            phone: payload.phoneNumber,
            message: msg
          });
        } catch (e) {
          // ignore if whatsapp isn't connected
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      setCallSuccessFeedback('Call outcome logged & next follow-up saved!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      queryClient.invalidateQueries({ queryKey: ['calls-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setTimeout(() => {
        setCallSuccessFeedback(null);
        setCallModalLead(null);
      }, 1000);
    }
  });

  // 2. Direct Schedule Follow-Up Mutation
  const directScheduleFollowUpMutation = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      date: string;
      time: string;
      channel: string;
      purpose: string;
    }) => {
      const res = await api.post('/outreach/followups', {
        leadId: payload.leadId,
        date: payload.date,
        time: payload.time,
        channel: payload.channel,
        purpose: payload.purpose,
        notes: `Scheduled ${payload.channel.toUpperCase()} follow-up (${payload.purpose})`
      });

      const time24 = convertTimeTo24(payload.time || '11:00 AM');
      const nextDateTime = `${payload.date}T${time24}:00.000Z`;
      await api.put(`/leads/${payload.leadId}`, { nextFollowUp: nextDateTime });

      return res.data;
    },
    onSuccess: () => {
      setScheduleSuccessFeedback('Follow-up scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setTimeout(() => {
        setScheduleSuccessFeedback(null);
        setScheduleModalLead(null);
      }, 1000);
    }
  });

  // Dispatch Email Mutation (MailerCloud SMTP Integration)
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: { to: string; subject: string; text?: string; leadId?: string }) => {
      const res = await api.post('/outreach/email/send', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setEmailSuccessMsg(data.message || 'Email dispatched successfully!');
        setEmailErrorMsg(null);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
        setTimeout(() => {
          setEmailSuccessMsg(null);
          setActiveActionModal(null);
        }, 1800);
      } else {
        setEmailErrorMsg(data.error || data.message || 'Failed to dispatch email.');
      }
    },
    onError: (err: any) => {
      setEmailErrorMsg(err.response?.data?.message || err.message || 'Error dispatching email.');
    }
  });

  // Update page when mode changes
  useEffect(() => {
    setPage(1);
    setSelectedLeads([]);
  }, [location.pathname, defaultMode]);

  // Pre-flight duplicate check on phone/email entry
  const checkDuplicate = async (phoneVal: string, emailVal: string) => {
    if (!phoneVal || phoneVal.length < 7) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await api.post('/leads/check-duplicate', { phone: phoneVal, email: emailVal });
      if (res.data.isDuplicate) {
        setDuplicateWarning(res.data.existingLead);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      // Ignore
    }
  };

  // 1. Fetch Employees (Master data cached on client)
  const { data: employeesData } = useQuery({
    queryKey: ['employees-master-list'],
    queryFn: async () => {
      const res = await api.get('/assignment/config');
      return res.data.data?.reps || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes client cache
  });

  // 2. Fetch Leads List (Paginated, filtered)
  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads', currentMode, sourceFilter, employeeFilter, unassignedOnly, search, page, limit],
    queryFn: async () => {
      const res = await api.get('/leads', {
        params: {
          status: currentMode,
          source: sourceFilter || undefined,
          assignedTo: employeeFilter || undefined,
          unassignedOnly: unassignedOnly ? 'true' : undefined,
          search: search || undefined,
          page,
          limit
        }
      });
      return res.data.data;
    },
    placeholderData: (previousData) => previousData
  });

  const leads = leadsResponse?.leads || [];
  const counts = leadsResponse?.counts || { all: 0, today: 0, open: 0, converted: 0, lost: 0, unassigned: 0 };
  const pagination = leadsResponse?.pagination || { total: 0, page: 1, limit: 25, pages: 1 };

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leads', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowAddModal(false);
      resetNewLeadForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create lead.');
    }
  });

  // Bulk Reassign Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/leads/assign', {
        leadIds: selectedLeads,
        assignedTo: targetRepId,
        reason: 'Bulk reassignment from leads workspace'
      });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Leads reassigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setBulkAssignModal(false);
      setSelectedLeads([]);
    }
  });

  // Bulk Action Mutation (Tags, Delete, Status)
  const bulkActionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leads/bulk', { ...payload, leadIds: selectedLeads });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads([]);
    }
  });



  const resetNewLeadForm = () => {
    setNewName('');
    setNewCompany('');
    setNewPhone('');
    setNewEmail('');
    setNewSource('Website');
    setNewService('');
    setNewAssignedTo('');
    setNewNotes('');
    setDuplicateWarning(null);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(leads.map((l: any) => l._id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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

  const handleOpenWhatsAppModal = (lead: any) => {
    setSelectedLeadForAction(lead);
    setWaTemplate('quotation_followup');
    setWaCustomMessage(WA_TEMPLATES.quotation_followup.text(lead.name, lead.serviceInterested));
    setActiveActionModal('whatsapp');
  };

  const handleOpenEmailModal = (lead: any) => {
    if (!lead.email) {
      alert('This lead does not have an email address specified.');
      return;
    }
    setSelectedLeadForAction(lead);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);
    setEmailSubject(`Proposal Follow-up: ArthaVenture — ${lead.serviceInterested || 'Services'}`);
    setEmailBody(`Dear ${lead.name},\n\nThank you for your interest in our services. We look forward to working with you.\n\nPlease feel free to contact us with any questions.\n\nWarm regards,\nSales Team\nArthaVenture`);
    setActiveActionModal('email');
  };

  const handleLaunchWhatsApp = () => {
    if (!selectedLeadForAction) return;
    const cleanPhone = selectedLeadForAction.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(waCustomMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setActiveActionModal(null);
  };

  // STAGE THEME DEFINITIONS: Unified styling across parent pipeline & sub-pipeline
  const STAGE_THEMES: Record<string, {
    name: string;
    chipLabel: string;
    activeCard: string;
    activeBadge: string;
    inactiveBadge: string;
    subActiveCard: string;
    subInactiveHover: string;
    buttonClass: string;
    accentBorder: string;
    accentText: string;
  }> = {
    all: {
      name: 'All Leads',
      chipLabel: 'Status Filter',
      activeCard: 'btn-blue-45 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'btn-blue-45 text-white shadow-xs ring-1 ring-blue-400/30',
      subInactiveHover: 'hover:border-blue-400/60 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400',
      buttonClass: 'btn-blue-45 text-white shadow-md',
      accentBorder: 'border-blue-300 dark:border-blue-800',
      accentText: 'text-blue-600 dark:text-blue-400'
    },
    today: {
      name: 'New Leads',
      chipLabel: 'New Filter',
      activeCard: 'btn-orange-45 text-white border-orange-500 shadow-md shadow-orange-500/30 ring-2 ring-orange-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'btn-orange-45 text-white shadow-xs ring-1 ring-orange-400/30',
      subInactiveHover: 'hover:border-orange-400/60 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400',
      buttonClass: 'btn-orange-45 text-white shadow-md',
      accentBorder: 'border-orange-300 dark:border-orange-800',
      accentText: 'text-orange-600 dark:text-orange-400'
    },
    open: {
      name: 'Open Leads',
      chipLabel: 'Open Sub-Stages',
      activeCard: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs ring-1 ring-amber-400/30',
      subInactiveHover: 'hover:border-amber-400/60 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400',
      buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20',
      accentBorder: 'border-amber-300 dark:border-amber-800',
      accentText: 'text-amber-600 dark:text-amber-400'
    },
    followup: {
      name: 'Follow-Up',
      chipLabel: 'Outreach Stage',
      activeCard: 'btn-blue-45 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'btn-blue-45 text-white shadow-xs ring-1 ring-blue-400/30',
      subInactiveHover: 'hover:border-blue-400/60 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400',
      buttonClass: 'btn-blue-45 text-white shadow-md',
      accentBorder: 'border-blue-300 dark:border-blue-800',
      accentText: 'text-blue-600 dark:text-blue-400'
    },
    converted: {
      name: 'Converted',
      chipLabel: 'Converted Stages',
      activeCard: 'btn-green-45 text-white border-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'btn-green-45 text-white shadow-xs ring-1 ring-emerald-400/30',
      subInactiveHover: 'hover:border-emerald-400/60 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400',
      buttonClass: 'btn-green-45 text-white shadow-md',
      accentBorder: 'border-emerald-300 dark:border-emerald-800',
      accentText: 'text-emerald-600 dark:text-emerald-400'
    },
    lost: {
      name: 'Lost Leads',
      chipLabel: 'Lost Reasons',
      activeCard: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-500 shadow-md shadow-rose-500/30 ring-2 ring-rose-400/40',
      activeBadge: 'bg-white/20 text-white backdrop-blur-xs border border-white/25',
      inactiveBadge: 'bg-slate-200/60 dark:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-dark-600/50',
      subActiveCard: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-xs ring-1 ring-rose-400/30',
      subInactiveHover: 'hover:border-rose-400/60 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400',
      buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20',
      accentBorder: 'border-rose-300 dark:border-rose-800',
      accentText: 'text-rose-600 dark:text-rose-400'
    }
  };

  // Fetch follow-up stats for tab badge
  const { data: followupsBadgeResponse } = useQuery({
    queryKey: ['followups-badge-summary'],
    queryFn: async () => {
      try {
        const res = await api.get('/outreach/followups');
        return res.data;
      } catch (e) {
        return null;
      }
    },
    staleTime: 60 * 1000
  });

  const followupTotalCount = followupsBadgeResponse?.stats?.total ?? followupsBadgeResponse?.data?.length ?? 0;

  const currentTheme = STAGE_THEMES[currentMode] || STAGE_THEMES.all;

  const currentTotal =
    currentMode === 'today' ? (counts.today ?? 0) :
      currentMode === 'open' ? (counts.open ?? 0) :
        currentMode === 'converted' ? (counts.converted ?? 0) :
          currentMode === 'lost' ? (counts.lost ?? 0) : (counts.all ?? 0);

  const unassignedCount = counts.unassigned ?? 0;
  const assignedCount = Math.max(0, currentTotal - (currentMode === 'all' ? unassignedCount : 0));
  const highPriorityCount = leads.filter((l: any) => l.priority === 'High' || l.priority === 'Urgent').length;

  const subStageCounts: Record<string, number> = counts.subStages || {
    'In Process': 0,
    'Qualified': 0,
    'Proposal Sent': 0,
    'Negotiation': 0
  };

  const lostReasonCounts: Record<string, number> = counts.lostReasons || {
    'Price': 0,
    'No Response': 0,
    'Competitor': 0,
    'Not Interested': 0,
    'Other': 0
  };

  const convertedStageCounts: Record<string, number> = counts.convertedStages || {
    'Quotation Won': 0,
    'Invoiced': 0,
    'Direct Won': 0,
    'High Value': 0
  };

  const filteredLeads = leads.filter((lead: any) => {
    if (currentMode === 'open') {
      if (subFilter !== 'all') {
        const leadStage = lead.leadType || 'In Process';
        if (leadStage.toLowerCase() !== subFilter.toLowerCase()) return false;
      }
    } else if (currentMode === 'lost') {
      if (subFilter !== 'all') {
        const reason = lead.lostReason || 'Other';
        if (reason.toLowerCase() !== subFilter.toLowerCase()) return false;
      }
    } else if (currentMode === 'converted') {
      if (subFilter !== 'all') {
        if (subFilter === 'Quotation Won') {
          const match = lead.convertedQuotationId || lead.leadType === 'Quotation Won';
          if (!match) return false;
        } else if (subFilter === 'Invoiced') {
          const match = lead.convertedInvoiceId || lead.leadType === 'Invoiced' || lead.leadType === 'Invoiced & Billed';
          if (!match) return false;
        } else if (subFilter === 'High Value') {
          const isHighVal = (lead.expectedValue && lead.expectedValue >= 25000) || ['high', 'urgent', 'High', 'Urgent'].includes(lead.priority);
          if (!isHighVal) return false;
        } else if (subFilter === 'Direct Won') {
          const isDirect = !lead.convertedQuotationId && !lead.convertedInvoiceId && (!lead.leadType || lead.leadType === 'Direct Won' || lead.leadType === '');
          if (!isDirect) return false;
        }
      }
    } else {
      if (subFilter === 'assigned' && !lead.assignedTo) return false;
      if (subFilter === 'unassigned' && lead.assignedTo) return false;
      if (subFilter === 'high_priority' && lead.priority !== 'High' && lead.priority !== 'Urgent') return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
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
                Active View: <strong className="text-slate-800 dark:text-slate-200">{currentTheme.name}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span>Total Funnel Leads:</span>
                <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-dark-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-dark-700">
                  {counts.all ?? 0}
                </span>
              </span>
            </div>
          </div>

          {/* Row 1: Pipeline Stage Tabs (Full-width 6-col grid) */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {/* All Leads */}
            <Link
              to="/crm/leads"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'all'
                  ? STAGE_THEMES.all.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-blue-400/60 dark:hover:border-blue-600/60 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Users className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'all' ? 'text-white' : 'text-blue-500 group-hover:scale-110'}`} />
                <span className="truncate">{isPrivileged ? 'All Leads' : 'My Leads'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'all' ? STAGE_THEMES.all.activeBadge : STAGE_THEMES.all.inactiveBadge
              }`}>
                {counts.all}
              </span>
            </Link>

            {/* New Leads */}
            <Link
              to="/crm/today-leads"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'today'
                  ? STAGE_THEMES.today.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-orange-400/60 dark:hover:border-orange-600/60 hover:text-orange-600 dark:hover:text-orange-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'today' ? 'text-white' : 'text-[#fe7c02] group-hover:scale-110'}`} />
                <span className="truncate">New Leads</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'today' ? STAGE_THEMES.today.activeBadge : STAGE_THEMES.today.inactiveBadge
              }`}>
                {counts.today ?? 0}
              </span>
            </Link>

            {/* Open Leads */}
            <Link
              to="/crm/open-leads"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'open'
                  ? STAGE_THEMES.open.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-amber-400/60 dark:hover:border-amber-600/60 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Flame className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'open' ? 'text-white' : 'text-amber-500 group-hover:scale-110'}`} />
                <span className="truncate">Open Leads</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'open' ? STAGE_THEMES.open.activeBadge : STAGE_THEMES.open.inactiveBadge
              }`}>
                {counts.open}
              </span>
            </Link>

            {/* Follow-Up */}
            <Link
              to="/crm/followups"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'followup'
                  ? STAGE_THEMES.followup.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-blue-400/60 dark:hover:border-blue-600/60 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Clock className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'followup' ? 'text-white' : 'text-blue-500 group-hover:scale-110'}`} />
                <span className="truncate">Follow-Up</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'followup' ? STAGE_THEMES.followup.activeBadge : STAGE_THEMES.followup.inactiveBadge
              }`}>
                {followupTotalCount}
              </span>
            </Link>

            {/* Converted */}
            <Link
              to="/crm/converted-leads"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'converted'
                  ? STAGE_THEMES.converted.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-emerald-400/60 dark:hover:border-emerald-600/60 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Trophy className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'converted' ? 'text-white' : 'text-[#028825] group-hover:scale-110'}`} />
                <span className="truncate">Converted</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'converted' ? STAGE_THEMES.converted.activeBadge : STAGE_THEMES.converted.inactiveBadge
              }`}>
                {counts.converted}
              </span>
            </Link>

            {/* Lost Leads */}
            <Link
              to="/crm/lost-leads"
              className={`group relative flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 border cursor-pointer ${
                currentMode === 'lost'
                  ? STAGE_THEMES.lost.activeCard
                  : 'bg-slate-50/70 hover:bg-white dark:bg-dark-800/60 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 hover:border-rose-400/60 dark:hover:border-rose-600/60 hover:text-rose-600 dark:hover:text-rose-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <XCircle className={`h-4 w-4 shrink-0 transition-colors ${currentMode === 'lost' ? 'text-white' : 'text-rose-500 group-hover:scale-110'}`} />
                <span className="truncate">Lost Leads</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ml-1.5 transition-colors ${
                currentMode === 'lost' ? STAGE_THEMES.lost.activeBadge : STAGE_THEMES.lost.inactiveBadge
              }`}>
                {counts.lost}
              </span>
            </Link>
          </div>

          {/* Row 2: Sub-Pipeline / Filter Stage Strip */}
          <div className="pt-2 border-t border-slate-100 dark:border-dark-800/80">
            <div className="bg-slate-50/80 dark:bg-dark-950/70 rounded-xl p-2 sm:p-2.5 border border-slate-200/70 dark:border-dark-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Filter className="h-3.5 w-3.5 text-blue-500" />
                  <span className="uppercase text-[11px] tracking-wider text-slate-500 dark:text-slate-400">
                    {currentMode === 'open' ? 'Sub-Stages:' :
                     currentMode === 'converted' ? 'Fulfillment:' :
                     currentMode === 'lost' ? 'Reason Filter:' : 'Quick Views:'}
                  </span>
                </div>
              </div>

              <div className="w-full">
                {currentMode === 'open' ? (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {/* All Open */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('all'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'all'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Flame className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">All Open</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {counts.open ?? 0}
                      </span>
                    </button>

                    {/* In Process */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('In Process'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'In Process'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Zap className="h-3.5 w-3.5 shrink-0 fill-current" />
                        <span className="truncate">In Process</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'In Process' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {subStageCounts['In Process'] ?? 0}
                      </span>
                    </button>

                    {/* Qualified */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Qualified'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Qualified'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Target className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Qualified</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Qualified' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {subStageCounts['Qualified'] ?? 0}
                      </span>
                    </button>

                    {/* Proposal Sent */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Proposal Sent'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Proposal Sent'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Send className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Proposal Sent</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Proposal Sent' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {subStageCounts['Proposal Sent'] ?? 0}
                      </span>
                    </button>

                    {/* Negotiation */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Negotiation'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Negotiation'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Handshake className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Negotiation</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Negotiation' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {subStageCounts['Negotiation'] ?? 0}
                      </span>
                    </button>
                  </div>
                ) : currentMode === 'converted' ? (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {/* All Converted */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('all'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'all'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Trophy className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">All Converted</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {counts.converted ?? 0}
                      </span>
                    </button>

                    {/* Quotation Won */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Quotation Won'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Quotation Won'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Quotation Won</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Quotation Won' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {convertedStageCounts['Quotation Won'] ?? 0}
                      </span>
                    </button>

                    {/* Invoiced & Billed */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Invoiced'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Invoiced'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Invoiced & Billed</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Invoiced' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {convertedStageCounts['Invoiced'] ?? 0}
                      </span>
                    </button>

                    {/* Direct Won */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Direct Won'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Direct Won'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Zap className="h-3.5 w-3.5 shrink-0 fill-current" />
                        <span className="truncate">Direct Won</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Direct Won' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {convertedStageCounts['Direct Won'] ?? 0}
                      </span>
                    </button>

                    {/* High Value Deals */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('High Value'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'High Value'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">High Value</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'High Value' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {convertedStageCounts['High Value'] ?? 0}
                      </span>
                    </button>
                  </div>
                ) : currentMode === 'lost' ? (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {/* All Lost */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('all'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'all'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">All Lost</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {counts.lost ?? 0}
                      </span>
                    </button>

                    {/* Price Constraint */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Price'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Price'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <span className="truncate">💰 Price</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Price' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {lostReasonCounts['Price'] ?? 0}
                      </span>
                    </button>

                    {/* No Response */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('No Response'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'No Response'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <span className="truncate">📵 No Response</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'No Response' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {lostReasonCounts['No Response'] ?? 0}
                      </span>
                    </button>

                    {/* Competitor */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Competitor'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Competitor'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <span className="truncate">⚔️ Competitor</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Competitor' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {lostReasonCounts['Competitor'] ?? 0}
                      </span>
                    </button>

                    {/* Not Interested */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Not Interested'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Not Interested'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <span className="truncate">🚫 Not Interested</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Not Interested' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {lostReasonCounts['Not Interested'] ?? 0}
                      </span>
                    </button>

                    {/* Other */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('Other'); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'Other'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <span className="truncate">❓ Other</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'Other' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {lostReasonCounts['Other'] ?? 0}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Subpipeline: All Overview */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('all'); setUnassignedOnly(false); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'all'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">All Overview</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {currentTotal}
                      </span>
                    </button>

                    {/* Subpipeline: Assigned */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('assigned'); setUnassignedOnly(false); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'assigned'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Assigned</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'assigned' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {assignedCount}
                      </span>
                    </button>

                    {/* Subpipeline: Unassigned */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('unassigned'); setUnassignedOnly(true); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'unassigned'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Unassigned</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {unassignedCount}
                      </span>
                    </button>

                    {/* Subpipeline: High Priority */}
                    <button
                      type="button"
                      onClick={() => { setSubFilter('high_priority'); setUnassignedOnly(false); setPage(1); }}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        subFilter === 'high_priority'
                          ? currentTheme.subActiveCard
                          : `bg-white dark:bg-dark-800/90 hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-dark-700 ${currentTheme.subInactiveHover}`
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">High Priority</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 ${
                        subFilter === 'high_priority' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {highPriorityCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-3.5 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, phone (e.g. 9876543210), email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Source Filter */}
        <div className="w-full md:w-44">
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-semibold text-slate-700 dark:text-dark-200 outline-none cursor-pointer"
          >
            <option value="">All Sources</option>
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

        {/* Assigned Rep Filter */}
        {isPrivileged && (
          <div className="w-full md:w-48">
            <select
              value={employeeFilter}
              onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-semibold text-slate-700 dark:text-dark-200 outline-none cursor-pointer"
            >
              <option value="">All Team Members</option>
              {(employeesData || []).map((r: any) => (
                <option key={r.user._id} value={r.user._id}>
                  {r.user.firstName} {r.user.lastName} ({r.role || 'Sale Executive'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Size Selector */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase">ROWS:</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* 4. Multi-Select Bulk Actions Floating Banner (Admins & Managers only) */}
      {isManager && selectedLeads.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] flex items-center justify-center text-xs text-white font-black shadow-xs">
              {selectedLeads.length}
            </span>
            <span>Leads Selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBulkAssignModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl btn-tri-45 text-xs font-bold transition active:scale-95"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Assign To...</span>
            </button>

            <button
              onClick={() => {
                const tag = prompt('Enter tag to add (e.g. "High Intent", "VIP"):');
                if (tag) bulkActionMutation.mutate({ action: 'add_tag', tag });
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Add Tag</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete ${selectedLeads.length} selected lead(s)?`)) {
                  bulkActionMutation.mutate({ action: 'delete' });
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-xs font-bold transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedLeads([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Leads Table (with Skeleton Loaders) */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm">
        {isLoading ? (
          /* SKELETON LOADER ROWS */
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
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="h-12 w-12 text-slate-300 dark:text-dark-600 mx-auto" />
            <p className="text-base font-bold text-slate-800 dark:text-white">No Leads Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No lead records match your active subpipeline or filter criteria.
            </p>
            {isManager && (
              <button
                onClick={() => { resetNewLeadForm(); setShowAddModal(true); }}
                className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl ${currentTheme.buttonClass} font-bold text-xs`}
              >
                <Plus className="h-4 w-4" />
                <span>Add First Lead</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-dark-800 rounded-2xl">
            <table className="w-full min-w-[820px] text-left text-xs text-slate-600 dark:text-dark-300">
              <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase tracking-wider border-b border-slate-200/80 dark:border-dark-700">
                <tr>
                  <th className="p-3 w-8 whitespace-nowrap">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      className="rounded text-primary-600 outline-none"
                    />
                  </th>
                  <th className="p-3 whitespace-nowrap">LEAD ID</th>
                  <th className="p-3 whitespace-nowrap">LEAD DETAILS</th>
                  <th className="p-3 whitespace-nowrap">CONTACT</th>
                  <th className="p-3 whitespace-nowrap">SOURCE</th>
                  <th className="p-3 whitespace-nowrap">ASSIGNED TO</th>
                  <th className="p-3 whitespace-nowrap">STATUS</th>
                  <th className="p-3 whitespace-nowrap">NEXT FOLLOW-UP</th>
                  <th className="p-3 text-right whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                {filteredLeads.map((lead: any) => (
                  <tr key={lead._id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/30 transition">
                    <td className="p-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => handleToggleSelect(lead._id)}
                        className="rounded text-primary-600 outline-none"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      <Link to={`/crm/leads/${lead._id}`} className="hover:underline">
                        {lead.leadId}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/40">
                          {(lead.name || 'L').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/crm/leads/${lead._id}`} className="font-bold text-slate-800 dark:text-white hover:text-blue-600 block truncate max-w-[160px]">
                            {lead.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">{lead.company || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 space-y-0.5 font-mono whitespace-nowrap">
                      <p className="font-semibold text-slate-700 dark:text-dark-200 text-xs">{lead.phone}</p>
                      {lead.email && <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{lead.email}</p>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                        {lead.source}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {lead.assignedTo ? (
                        <div className="flex items-center space-x-1.5 text-slate-800 dark:text-dark-200 font-medium text-xs">
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-dark-700 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-600">
                            {lead.assignedTo.firstName?.[0] || 'U'}
                          </div>
                          <span className="truncate max-w-[110px]">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 font-extrabold text-[10px] tracking-wide uppercase">
                          UNASSIGNED
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <PipelineStatusDropdown
                        leadId={lead._id}
                        currentStatus={lead.status || 'New'}
                        currentSubStage={lead.leadType || (lead.convertedInvoiceId ? 'Invoiced' : lead.convertedQuotationId ? 'Quotation Won' : undefined)}
                        currentLostReason={lead.lostReason}
                        readOnly={true}
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {lead.nextFollowUp ? (
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(lead)}
                          title="Click to reschedule Follow-up"
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/80 transition hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{new Date(lead.nextFollowUp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </button>
                      ) : (lead.status === 'Open' || currentMode === 'open') ? (
                        <button
                          type="button"
                          onClick={() => handleOpenScheduleModal(lead)}
                          title="Click to schedule Follow-up date & time"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-medium text-slate-400 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-dashed border-slate-200 dark:border-dark-700 hover:border-primary-300 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-400 group-hover:text-primary-500" />
                          <span>Set Follow-up</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-dark-600 text-xs font-semibold pl-2">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCallModal(lead)}
                          title="Call Lead & Log Outcome (No Answer, Busy, etc.)"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition hover:scale-110 active:scale-95 shadow-xs"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppModal(lead)}
                          title="Send WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 transition"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEmailModal(lead)}
                          title="Send Email"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 transition"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          to={`/crm/leads/${lead._id}`}
                          title="View & Audit Lead Details"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 font-semibold text-[11px] transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-dark-800 text-xs">
            <p className="text-slate-400">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} total leads)
            </p>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Quick-Add Lead Modal (with Duplicate Detection) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white">Quick-Add Single Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Duplicate Warning Prompt */}
            {duplicateWarning && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  <span>Existing Lead Match Detected!</span>
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-[11px]">
                  A lead with this phone number already exists: <strong>#{duplicateWarning.leadId} - {duplicateWarning.name}</strong> (Assigned to: {duplicateWarning.assignedTo ? `${duplicateWarning.assignedTo.firstName} ${duplicateWarning.assignedTo.lastName}` : 'Unassigned'}).
                </p>
                <div className="flex space-x-2 pt-1">
                  <Link
                    to={`/crm/leads/${duplicateWarning._id}`}
                    className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px]"
                  >
                    Open Existing Lead
                  </Link>
                  <button
                    onClick={() => {
                      createLeadMutation.mutate({
                        name: newName,
                        company: newCompany,
                        phone: newPhone,
                        email: newEmail,
                        source: newSource,
                        serviceInterested: newService,
                        assignedTo: newAssignedTo || undefined,
                        notes: newNotes,
                        force: true
                      });
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-200 text-slate-800 dark:bg-dark-800 dark:text-dark-200 font-bold text-[10px]"
                  >
                    Create Anyway
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLeadMutation.mutate({
                  name: newName,
                  company: newCompany,
                  phone: newPhone,
                  email: newEmail,
                  source: newSource,
                  serviceInterested: newService,
                  assignedTo: isManager ? (newAssignedTo || undefined) : user?.id,
                  notes: newNotes
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Lead Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Company / Organization</label>
                  <input
                    type="text"
                    placeholder="Company name..."
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e) => {
                      setNewPhone(e.target.value);
                      checkDuplicate(e.target.value, newEmail);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="lead@company.com"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      checkDuplicate(newPhone, e.target.value);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Source</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
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
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">
                    {isPrivileged ? 'Assign To (Optional)' : 'Assigned Agent'}
                  </label>
                  {isPrivileged ? (
                    <select
                      value={newAssignedTo}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none text-xs font-semibold"
                    >
                      <option value="">-- Leave Unassigned (New) --</option>
                      {(employeesData || []).map((r: any) => (
                        <option key={r.user._id} value={r.user._id}>
                          {r.user.firstName} {r.user.lastName} ({r.role || 'Sale Executive'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-dark-300 font-semibold text-xs">
                      You ({user?.firstName} {user?.lastName})
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Service / Requirement</label>
                <input
                  type="text"
                  placeholder="e.g. Loan inquiry, GST registration..."
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context from client..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-dark-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 rounded-xl btn-tri-45 text-white font-bold transition disabled:opacity-50 active:scale-95"
                >
                  {createLeadMutation.isPending ? 'Saving...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Bulk Reassign Modal */}
      {bulkAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              Bulk Reassign ({selectedLeads.length} Leads)
            </h3>
            <p className="text-xs text-slate-400">Select target sales representative to reallocate selected leads:</p>

            <select
              value={targetRepId}
              onChange={(e) => setTargetRepId(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-xs font-bold outline-none"
            >
              <option value="">-- Choose Team Member --</option>
              {(employeesData || []).map((r: any) => (
                <option key={r.user._id} value={r.user._id}>
                  {r.user.firstName} {r.user.lastName} ({r.role || 'Sale Executive'} • {r.workload?.openLeads || 0} active)
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setBulkAssignModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!targetRepId || bulkAssignMutation.isPending}
                onClick={() => bulkAssignMutation.mutate()}
                className="px-5 py-2 rounded-xl btn-tri-45 text-white font-bold text-xs disabled:opacity-50 active:scale-95"
              >
                {bulkAssignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. WhatsApp Launcher Modal */}
      {activeActionModal === 'whatsapp' && selectedLeadForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <span>WhatsApp Message Launcher</span>
              </h3>
              <button onClick={() => setActiveActionModal(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800 text-xs space-y-1">
              <p className="font-bold text-slate-700 dark:text-white">To: {selectedLeadForAction.name} ({selectedLeadForAction.phone})</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700 dark:text-white">Select Pre-Approved Template</label>
              <select
                value={waTemplate}
                onChange={(e) => {
                  setWaTemplate(e.target.value);
                  setWaCustomMessage(WA_TEMPLATES[e.target.value].text(selectedLeadForAction.name, selectedLeadForAction.serviceInterested));
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none"
              >
                {Object.entries(WA_TEMPLATES).map(([key, val]) => (
                  <option key={key} value={key}>{val.title}</option>
                ))}
              </select>

              <label className="block font-bold text-slate-700 dark:text-white pt-2">Message Text</label>
              <textarea
                rows={4}
                value={waCustomMessage}
                onChange={(e) => setWaCustomMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 outline-none font-sans leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button onClick={() => setActiveActionModal(null)} className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs">
                Cancel
              </button>
              <button
                onClick={handleLaunchWhatsApp}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open WhatsApp Web/App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Email Composer Modal */}
      {activeActionModal === 'email' && selectedLeadForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <span>Compose Follow-Up Email</span>
              </h3>
              <button
                onClick={() => { setActiveActionModal(null); setEmailErrorMsg(null); setEmailSuccessMsg(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {emailSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {emailErrorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{emailErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">To</label>
                <input
                  type="text"
                  readOnly
                  value={`${selectedLeadForAction.name} <${selectedLeadForAction.email}>`}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Email Body</label>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type email body here..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none font-sans text-xs leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-dark-800">
              <a
                href={`mailto:${selectedLeadForAction.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[11px] underline"
                target="_blank"
                rel="noreferrer"
              >
                Or open in mail app
              </a>

              <div className="flex space-x-2">
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
                      to: selectedLeadForAction.email,
                      subject: emailSubject,
                      text: emailBody,
                      leadId: selectedLeadForAction._id
                    });
                  }}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-blue-500/20"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Quick Call Outcome & Follow-Up Modal */}
      {callModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Log Call Outcome & Follow-Up</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {callModalLead.name} • <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{callModalLead.phone}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCallModalLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {callSuccessFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{callSuccessFeedback}</span>
              </div>
            )}

            {/* Direct Dial Action Box */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-700 dark:text-slate-200">Initiate Call on Device</p>
                <p className="text-[11px] text-slate-400">Click to dial from your phone / SIM app</p>
              </div>
              <a
                href={`tel:${callModalLead.phone}`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs hover:scale-105 active:scale-95"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Dial Now</span>
              </a>
            </div>

            {/* 1. Call Outcome Tag Selector */}
            <div className="space-y-1.5">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Call Outcome Tag *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { tag: 'No Answer', label: '❌ No Answer', desc: 'No pickup, rang full', color: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' },
                  { tag: 'Busy', label: '📵 Busy', desc: 'Line busy / rejected', color: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
                  { tag: 'Switched Off', label: '📴 Switched Off', desc: 'Unreachable / off', color: 'border-slate-300 text-slate-700 bg-slate-100 dark:bg-dark-800 dark:text-slate-300' },
                  { tag: 'Call Back Later', label: '⏱️ Call Back Later', desc: 'Client requested callback', color: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300' },
                  { tag: 'Interested', label: '👍 Connected & Interested', desc: 'Positive discussion', color: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
                  { tag: 'Not Interested', label: '🚫 Not Interested', desc: 'Dropped requirement', color: 'border-zinc-300 text-zinc-700 bg-zinc-100 dark:bg-dark-800 dark:text-zinc-300' }
                ].map((item) => {
                  const isSelected = callOutcome === item.tag;
                  return (
                    <button
                      type="button"
                      key={item.tag}
                      onClick={() => {
                        setCallOutcome(item.tag);
                        setCallNotes(item.desc);
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

            {/* 2. Next Follow-Up Schedule Shortcuts */}
            <div className="space-y-2 pt-1">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Schedule Next Follow-Up (Retry/Callback)
              </label>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCallFollowUpDate(getTodayDate());
                    setCallFollowUpTime('04:00 PM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                >
                  ⚡ Today 4:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallFollowUpDate(getTomorrowDate());
                    setCallFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                >
                  ⚡ Tomorrow 11:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallFollowUpDate(getInDaysDate(2));
                    setCallFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                >
                  ⚡ In 2 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCallFollowUpDate(getInDaysDate(7));
                    setCallFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-200 dark:border-dark-700 transition cursor-pointer"
                >
                  ⚡ Next Week
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Date</label>
                  <input
                    type="date"
                    value={callFollowUpDate}
                    onChange={(e) => setCallFollowUpDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Time</label>
                  <select
                    value={callFollowUpTime}
                    onChange={(e) => setCallFollowUpTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none"
                  >
                    {['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Notes */}
            <div className="space-y-1">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Call Notes / Remark
              </label>
              <input
                type="text"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Call notes / key discussion..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* 4. Instant WhatsApp drop checkbox */}
            <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendWhatsAppPing}
                onChange={(e) => setAutoSendWhatsAppPing(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                💬 Also send WhatsApp "Sorry I missed you" follow-up message
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setCallModalLead(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={logCallAndFollowUpMutation.isPending}
                onClick={() => {
                  logCallAndFollowUpMutation.mutate({
                    leadId: callModalLead._id,
                    phoneNumber: callModalLead.phone,
                    outcome: callOutcome,
                    notes: callNotes,
                    nextFollowUpDate: callFollowUpDate,
                    nextFollowUpTime: callFollowUpTime,
                    autoSendWhatsApp: autoSendWhatsAppPing,
                    leadName: callModalLead.name
                  });
                }}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl btn-tri-45 disabled:opacity-50 text-white font-bold text-xs transition shadow-md active:scale-95"
              >
                {logCallAndFollowUpMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Call & Follow-Up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Quick Direct Schedule Follow-Up Modal */}
      {scheduleModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Schedule Next Follow-Up</h3>
                  <p className="text-xs text-slate-400 font-medium">{scheduleModalLead.name}</p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scheduleSuccessFeedback && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{scheduleSuccessFeedback}</span>
              </div>
            )}

            {/* Date Presets */}
            <div className="space-y-2">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Quick Date Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDirectFollowUpDate(getTodayDate());
                    setDirectFollowUpTime('04:00 PM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                >
                  ⚡ Today 4:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectFollowUpDate(getTomorrowDate());
                    setDirectFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                >
                  ⚡ Tomorrow 11:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectFollowUpDate(getInDaysDate(2));
                    setDirectFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                >
                  ⚡ In 2 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectFollowUpDate(getInDaysDate(7));
                    setDirectFollowUpTime('11:00 AM');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-200 dark:border-dark-700 transition cursor-pointer"
                >
                  ⚡ Next Week
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Date</label>
                  <input
                    type="date"
                    value={directFollowUpDate}
                    onChange={(e) => setDirectFollowUpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Time</label>
                  <select
                    value={directFollowUpTime}
                    onChange={(e) => setDirectFollowUpTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none"
                  >
                    {['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="space-y-1">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Follow-Up Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'phone', label: '📞 Phone Call' },
                  { id: 'whatsapp', label: '💬 WhatsApp' },
                  { id: 'email', label: '✉️ Email' }
                ].map((ch) => (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={() => setDirectFollowUpChannel(ch.id as any)}
                    className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${directFollowUpChannel === ch.id
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs'
                        : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300'
                      }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <label className="block font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Purpose / Agenda
              </label>
              <input
                type="text"
                value={directFollowUpPurpose}
                onChange={(e) => setDirectFollowUpPurpose(e.target.value)}
                placeholder="Follow-up agenda..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white text-xs outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setScheduleModalLead(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={directScheduleFollowUpMutation.isPending}
                onClick={() => {
                  directScheduleFollowUpMutation.mutate({
                    leadId: scheduleModalLead._id,
                    date: directFollowUpDate,
                    time: directFollowUpTime,
                    channel: directFollowUpChannel,
                    purpose: directFollowUpPurpose
                  });
                }}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl btn-tri-45 disabled:opacity-50 text-white font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
              >
                {directScheduleFollowUpMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Save Follow-Up</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
