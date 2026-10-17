import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { 
  Phone, Mail, MessageSquare, Instagram, Sparkles, 
  Calendar, CheckCircle2, Clock, Users, ArrowRight, 
  ChevronRight, Zap, Filter, PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OutreachHub: React.FC = () => {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<any>(null);
  const [actionType, setActionType] = useState<'call' | 'email' | 'whatsapp' | 'instagram' | null>(null);
  
  // Quick Send Form States
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [igMessage, setIgMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // 1. Fetch Follow-ups Queue
  const { data: followupsData, isLoading: loadingFollowups } = useQuery({
    queryKey: ['outreach-followups', channelFilter],
    queryFn: async () => {
      const params: any = { period: 'today' };
      if (channelFilter !== 'all') params.channel = channelFilter;
      const res = await api.get('/outreach/followups', { params });
      return res.data.data;
    }
  });

  // 2. Fetch High-Priority Leads for AI Recommendations
  const { data: leadsData } = useQuery({
    queryKey: ['outreach-hot-leads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return (res.data.data || []).filter((l: any) => l.scoreCategory === 'hot' || l.scoreCategory === 'very_hot' || l.scoreCategory === 'warm').slice(0, 5);
    }
  });

  // 3. Fetch Call Dashboard Stats
  const { data: callStatsData } = useQuery({
    queryKey: ['call-dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/outreach/calls/dashboard');
      return res.data.data;
    }
  });

  // 4. Fetch Outreach Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['outreach-analytics'],
    queryFn: async () => {
      const res = await api.get('/outreach/analytics');
      return res.data.data;
    }
  });

  // Email Mutation (MailerCloud)
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/email/send', payload);
      return res.data;
    },
    onSuccess: () => {
      setSendSuccess('Email dispatched successfully via MailerCloud!');
      setTimeout(() => {
        setActionType(null);
        setSendSuccess(null);
        setEmailSubject('');
        setEmailBody('');
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
    }
  });

  // WhatsApp Mutation
  const sendWaMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/whatsapp/send', payload);
      return res.data;
    },
    onSuccess: () => {
      setSendSuccess('WhatsApp message delivered!');
      setTimeout(() => {
        setActionType(null);
        setSendSuccess(null);
        setWaMessage('');
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
    }
  });

  // Instagram Mutation
  const sendIgMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/instagram/send', payload);
      return res.data;
    },
    onSuccess: () => {
      setSendSuccess('Instagram Direct message sent!');
      setTimeout(() => {
        setActionType(null);
        setSendSuccess(null);
        setIgMessage('');
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
    }
  });

  const handleOpenAction = (lead: any, type: 'call' | 'email' | 'whatsapp' | 'instagram') => {
    setSelectedLeadForAction(lead);
    setActionType(type);
    if (type === 'email') {
      setEmailSubject(`ArthaVenture Proposal for ${lead.name}`);
      setEmailBody(`Hi ${lead.name},\n\nThank you for connecting with us regarding ${lead.serviceInterested || 'advisory services'}.\n\nPlease let us know if you have any questions.\n\nBest regards,\nArthaVenture Team`);
    } else if (type === 'whatsapp') {
      setWaMessage(`Hello ${lead.name}, this is your advisor from ArthaVenture regarding your ${lead.serviceInterested || 'inquiry'}. When is a good time for a quick 5-min call?`);
    } else if (type === 'instagram') {
      setIgMessage(`Hi ${lead.name}, thanks for reaching out on Instagram! Let us know how we can assist you.`);
    }
  };

  const handleExecuteSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForAction) return;

    if (actionType === 'email') {
      sendEmailMutation.mutate({
        to: selectedLeadForAction.email || 'client@example.com',
        subject: emailSubject,
        text: emailBody,
        html: `<p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
        leadId: selectedLeadForAction._id
      });
    } else if (actionType === 'whatsapp') {
      sendWaMutation.mutate({
        to: selectedLeadForAction.whatsApp || selectedLeadForAction.phone || '9876543210',
        customMessage: waMessage,
        leadId: selectedLeadForAction._id
      });
    } else if (actionType === 'instagram') {
      sendIgMutation.mutate({
        recipientHandle: selectedLeadForAction.instagram || `@${selectedLeadForAction.name.toLowerCase().replace(/\s+/g, '')}`,
        messageText: igMessage,
        leadId: selectedLeadForAction._id
      });
    }
  };

  const channelStats = analyticsData?.channelDistribution || {
    phone: 15,
    whatsapp: 8,
    email: 12,
    instagram: 4
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-primary-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>Unified Multi-Channel Communications</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Follow-up & Outreach Hub</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Execute high-impact outreach across strictly 4 approved channels: WhatsApp, Email (MailerCloud), Instagram, and Phone / Call.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/crm/calls"
            className="flex items-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg hover:shadow-amber-500/25 transition"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Call Dashboard
          </Link>
          <Link
            to="/crm/followups"
            className="flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md transition"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Planner
          </Link>
        </div>
      </div>

      {/* 4 Supported Channels Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Official API
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">WhatsApp</h3>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">Approved templates, media & delivery tracking</p>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-dark-800">
            <span className="text-slate-500">Active Touchpoints</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{channelStats.whatsapp}</span>
          </div>
        </div>

        {/* Email Card (MailerCloud) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              MailerCloud
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">Email</h3>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">SMTP & Transactional API with open tracking</p>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-dark-800">
            <span className="text-slate-500">Active Touchpoints</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{channelStats.email}</span>
          </div>
        </div>

        {/* Instagram Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/40 dark:text-fuchsia-400 flex items-center justify-center">
              <Instagram className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-wider">
              Meta Graph
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">Instagram</h3>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">Lead Direct Messaging & Conversation History</p>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-dark-800">
            <span className="text-slate-500">Active Touchpoints</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{channelStats.instagram}</span>
          </div>
        </div>

        {/* Phone / Call Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
              <Phone className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Mode 1 & 2
            </span>
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-base">Phone / Call</h3>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">Manual logging + Telephony Click-to-Call</p>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-dark-800">
            <span className="text-slate-500">Today Calls Completed</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{callStatsData?.today?.completed || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Follow-up Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">Today's Scheduled Outreach Queue</h2>
                <p className="text-xs text-slate-500 dark:text-dark-400">Scheduled touchpoints across WhatsApp, Email, Instagram, and Phone</p>
              </div>

              {/* Channel Filter Chips */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setChannelFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${channelFilter === 'all' ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-dark-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setChannelFilter('phone')}
                  className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition ${channelFilter === 'phone' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-dark-400'}`}
                >
                  <Phone className="h-3 w-3" />
                  <span>Call</span>
                </button>
                <button
                  onClick={() => setChannelFilter('whatsapp')}
                  className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition ${channelFilter === 'whatsapp' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-dark-400'}`}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => setChannelFilter('email')}
                  className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition ${channelFilter === 'email' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-dark-400'}`}
                >
                  <Mail className="h-3 w-3" />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => setChannelFilter('instagram')}
                  className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition ${channelFilter === 'instagram' ? 'bg-fuchsia-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-dark-400'}`}
                >
                  <Instagram className="h-3 w-3" />
                  <span>IG</span>
                </button>
              </div>
            </div>

            {/* List of items */}
            {loadingFollowups ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading queue...</div>
            ) : !followupsData || followupsData.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">All caught up!</h4>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">No pending outreach scheduled in this channel filter for today.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-dark-800">
                {followupsData.map((item: any) => {
                  const lead = item.leadId;
                  const channel = item.channel || item.type || 'phone';
                  return (
                    <div key={item._id} className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-800/40 px-2 rounded-xl transition">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {/* Channel Badge Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                          channel === 'email' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                          channel === 'instagram' ? 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                        }`}>
                          {channel === 'whatsapp' ? <MessageSquare className="h-4 w-4" /> :
                           channel === 'email' ? <Mail className="h-4 w-4" /> :
                           channel === 'instagram' ? <Instagram className="h-4 w-4" /> :
                           <Phone className="h-4 w-4" />}
                        </div>

                        <div className="overflow-hidden">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                              {lead?.name || 'Customer Inquiry'}
                            </span>
                            {lead?.scoreCategory && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                lead.scoreCategory === 'hot' || lead.scoreCategory === 'very_hot' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                                lead.scoreCategory === 'warm' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                                'bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-400'
                              }`}>
                                {lead.scoreCategory}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-dark-400 truncate">
                            {item.purpose} &bull; <Clock className="inline h-3 w-3 mr-0.5" />{item.time || '11:00 AM'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        {lead && (
                          <button
                            onClick={() => handleOpenAction(lead, channel)}
                            className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 hover:bg-primary-100 text-xs font-semibold transition flex items-center space-x-1"
                          >
                            <span>Execute</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        {lead && (
                          <Link
                            to={`/crm/leads/${lead._id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-dark-400 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Next-Action Recommendations */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white p-5 rounded-2xl shadow-md">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>AI Next-Action Engine</span>
            </div>
            <h3 className="font-bold text-base">Prioritized Recommendations</h3>
            <p className="text-xs text-indigo-200 mt-1">
              Cross-analyzes WhatsApp, Email, Instagram, and Phone history to recommend the best next action.
            </p>

            <div className="mt-4 space-y-3">
              {(leadsData || []).slice(0, 3).map((lead: any) => {
                const isHot = lead.scoreCategory === 'hot' || lead.scoreCategory === 'very_hot';
                const recommendedChannel = isHot ? 'Phone Call' : lead.source === 'Instagram' ? 'Instagram DM' : 'WhatsApp';
                return (
                  <div key={lead._id} className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{lead.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                        {lead.scoreCategory.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-100 mt-1">
                      {isHot ? '🔥 High intent. Direct voice call yields highest closing rate.' : '💬 Send WhatsApp quotation checklist.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-indigo-300">Target: {recommendedChannel}</span>
                      <button
                        onClick={() => handleOpenAction(lead, isHot ? 'call' : 'whatsapp')}
                        className="px-2.5 py-1 rounded bg-white text-indigo-950 font-bold text-[11px] hover:bg-indigo-50 transition"
                      >
                        Action Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm space-y-2">
            <h4 className="font-bold text-xs text-slate-400 dark:text-dark-500 uppercase tracking-wider">Outreach Modules</h4>
            <Link
              to="/crm/sequences"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-800 text-sm font-medium text-slate-700 dark:text-dark-200 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Automated Hot/Warm/Cold Sequences</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              to="/crm/campaigns"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-800 text-sm font-medium text-slate-700 dark:text-dark-200 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Users className="h-4 w-4 text-primary-500" />
                <span>Campaigns & Bulk Call Tasks</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
            <Link
              to="/crm/outreach-analytics"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-800 text-sm font-medium text-slate-700 dark:text-dark-200 transition"
            >
              <div className="flex items-center space-x-2.5">
                <Filter className="h-4 w-4 text-emerald-500" />
                <span>Multi-Channel Performance Analytics</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Modal (Email / WhatsApp / Instagram / Call) */}
      {actionType && selectedLeadForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${
                  actionType === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' :
                  actionType === 'email' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950' :
                  actionType === 'instagram' ? 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950' :
                  'bg-amber-50 text-amber-600 dark:bg-amber-950'
                }`}>
                  {actionType === 'whatsapp' ? <MessageSquare className="h-5 w-5" /> :
                   actionType === 'email' ? <Mail className="h-5 w-5" /> :
                   actionType === 'instagram' ? <Instagram className="h-5 w-5" /> :
                   <Phone className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white capitalize">
                    {actionType === 'call' ? 'Call Lead' : `Send ${actionType}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-dark-400">Recipient: {selectedLeadForAction.name}</p>
                </div>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {sendSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {actionType === 'call' ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-dark-800 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-dark-400">Phone Number:</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white">
                    {selectedLeadForAction.phone || selectedLeadForAction.whatsApp || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Link
                    to={`/crm/calls?leadId=${selectedLeadForAction._id}&action=call`}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-center text-sm shadow-md transition"
                  >
                    Open Call Screen with AI Brief
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteSend} className="space-y-3">
                {actionType === 'email' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 mb-1">
                    {actionType === 'email' ? 'Email Body (MailerCloud)' : actionType === 'whatsapp' ? 'WhatsApp Message' : 'Instagram Direct Message'}
                  </label>
                  <textarea
                    rows={4}
                    value={actionType === 'email' ? emailBody : actionType === 'whatsapp' ? waMessage : igMessage}
                    onChange={(e) => {
                      if (actionType === 'email') setEmailBody(e.target.value);
                      else if (actionType === 'whatsapp') setWaMessage(e.target.value);
                      else setIgMessage(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendEmailMutation.isPending || sendWaMutation.isPending || sendIgMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white btn-tri-45 shadow-md transition disabled:opacity-50 active:scale-95"
                  >
                    Send Now
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
