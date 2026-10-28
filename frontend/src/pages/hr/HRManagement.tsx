import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  PhoneCall, PhoneOutgoing, Smartphone, Download,
  Search, Plus, X, Calendar, Clock,
  CheckCircle, MessageSquare, Briefcase, History
} from 'lucide-react';

export const HRManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const currentRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');
  const isAdmin = ['Super Admin', 'Admin'].includes(currentRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');
  const isManager = isAdmin || currentRole === 'Manager';
  const isHR =
    ['HR', 'HR Executive', 'HR Caller', 'HR Specialist', 'HR Manager'].includes(currentRole) ||
    currentRole?.toLowerCase().includes('hr');
  const hasHRAccess = isManager || isHR;

  // Route Protection Guard: Only Admin, Manager, and HR allowed
  if (!hasHRAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [callerFilter, setCallerFilter] = useState('all');

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [callModalLead, setCallModalLead] = useState<any>(null);
  const [historyModalLead, setHistoryModalLead] = useState<any>(null);

  // Call logging form state
  const [callOutcome, setCallOutcome] = useState('Connected');
  const [callDuration, setCallDuration] = useState(60);
  const [callNotes, setCallNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Add HR Lead Form state (Admin only)
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    serviceInterested: 'Telecalling & Inside Sales',
    priority: 'medium',
    assignedTo: '',
    location: '',
    notes: ''
  });

  // 1. Fetch HR Stats
  const { data: statsData } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: async () => {
      const res = await api.get('/hr/stats');
      return res.data.data;
    }
  });

  // 2. Fetch HR Callers (for Admin assigning leads)
  const { data: callersData = [] } = useQuery({
    queryKey: ['hr-callers'],
    queryFn: async () => {
      const res = await api.get('/hr/callers');
      return res.data.data || [];
    },
    enabled: isAdmin
  });

  // 3. Fetch HR Leads
  const { data: leadsData = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['hr-leads', statusFilter, callerFilter, searchTerm],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (isAdmin && callerFilter !== 'all') params.assignedTo = callerFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/hr/leads', { params });
      return res.data.data || [];
    }
  });

  // 4. Fetch Call Logs for selected candidate
  const { data: callHistoryData = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['hr-call-history', historyModalLead?._id],
    queryFn: async () => {
      if (!historyModalLead?._id) return [];
      const res = await api.get(`/hr/leads/${historyModalLead._id}/call-logs`);
      return res.data.data || [];
    },
    enabled: !!historyModalLead?._id
  });

  // Mutations
  // Create Lead Mutation (Admin only)
  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/hr/leads', payload);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'HR candidate lead created successfully!');
      queryClient.invalidateQueries({ queryKey: ['hr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['hr-stats'] });
      setShowAddLeadModal(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        serviceInterested: 'Telecalling & Inside Sales',
        priority: 'medium',
        assignedTo: '',
        location: '',
        notes: ''
      });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create HR lead.');
    }
  });

  // Assign Lead Mutation (Admin only)
  const assignLeadMutation = useMutation({
    mutationFn: async ({ id, assignedTo }: { id: string; assignedTo: string }) => {
      const res = await api.patch(`/hr/leads/${id}/assign`, { assignedTo });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Lead assigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['hr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['hr-stats'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to assign lead.');
    }
  });

  // Log Call Mutation (Calling functionality)
  const logCallMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/hr/leads/${id}/call`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Call recorded successfully.');
      queryClient.invalidateQueries({ queryKey: ['hr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['hr-stats'] });
      setCallModalLead(null);
      setCallNotes('');
      setNextFollowUpDate('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to record call.');
    }
  });

  // Quick Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/hr/leads/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-leads'] });
      queryClient.invalidateQueries({ queryKey: ['hr-stats'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  });

  // Client-side quick filter
  const displayedLeads = useMemo(() => {
    return leadsData.filter((lead: any) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.serviceInterested?.toLowerCase().includes(q) ||
        lead.leadId?.toLowerCase().includes(q)
      );
    });
  }, [leadsData, searchTerm]);

  const handleStartCall = (lead: any) => {
    // Open telephone dialer
    window.location.href = `tel:${lead.phone}`;
    // Open call logging modal immediately
    setCallModalLead(lead);
    setCallOutcome('Connected');
    setCallDuration(60);
    setCallNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl btn-tri-45">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#fe7c02] via-[#0062d1] to-[#028825] shadow-lg">
                <PhoneCall className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  HR Calling & Recruitment
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Calling Only
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Dedicated candidate leads pipeline for HR. Click to call candidates directly or use the Artho Vista Mobile SIM Sync APK to automatically capture phone calls and talk-time duration in real time.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* APK Sync Badge & Download */}
            <a
              href="/api/download/apk"
              download="ArthoVista-CRM-Sync-v1.0.1-FIXED.apk"
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-sm transition flex items-center space-x-2 shadow-sm"
              title="Download Android Mobile SIM Sync APK"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Mobile Sync APK</span>
              <Download className="h-3 w-3 text-slate-300" />
            </a>

            {/* Admin-only Add Lead Button */}
            {isAdmin ? (
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#fe7c02] to-[#0062d1] hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 transition flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add HR Lead</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold flex items-center space-x-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
                <span>Assigned Leads Only</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Compact HR Calling KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
              Total HR Leads
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {statsData?.totalLeads ?? displayedLeads.length}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-dark-400 mt-0.5">Separate Candidate Pipeline</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
              {isAdmin ? 'Assigned to Callers' : 'Assigned to Me'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isAdmin ? (statsData?.totalLeads - (statsData?.unassignedLeads || 0)) || 0 : (statsData?.myAssignedLeads || displayedLeads.length)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-dark-400 mt-0.5">
              {isAdmin ? `${statsData?.unassignedLeads || 0} unassigned` : 'Your calling quota'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
              Calls Made Today
            </span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <PhoneOutgoing className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {statsData?.callsToday ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-dark-400 mt-0.5">APK & Web Logged</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
              Interviews Scheduled
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {statsData?.interviewsScheduled ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-dark-400 mt-0.5">Shortlisted Candidates</p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-dark-900 p-4 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search candidate by name, phone, role..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-300 focus:outline-none font-bold"
          >
            <option value="all">All Candidate Statuses</option>
            <option value="New">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested">Interested</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Callback">Callback Requested</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Caller Filter (Admin only) */}
          {isAdmin && (
            <select
              value={callerFilter}
              onChange={e => setCallerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-300 focus:outline-none font-bold"
            >
              <option value="all">All Callers / Staff</option>
              <option value="unassigned">Unassigned Only</option>
              {callersData.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. HR Candidate Leads Table with Instant Calling */}
      <div className="bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-dark-800/60 text-slate-500 dark:text-dark-400 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-dark-800">
              <tr>
                <th className="py-3.5 px-4">Candidate Name</th>
                <th className="py-3.5 px-4">Role / Position Applied</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">Assigned Caller</th>
                <th className="py-3.5 px-4">Last Call & Outcome</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Call Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {isLoadingLeads ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading candidate leads...
                  </td>
                </tr>
              ) : displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-dark-400">
                    <PhoneCall className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-600 mb-2" />
                    <p className="font-bold text-sm">No HR candidate leads found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAdmin
                        ? 'Click "+ Add HR Lead" above to add candidates and assign them to HR callers.'
                        : 'No candidate leads assigned to you by Admin yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLeads.map((lead: any) => {
                  const assigneeName = lead.assignedTo
                    ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                    : null;

                  return (
                    <tr
                      key={lead._id || lead.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-dark-800/40 transition group"
                    >
                      {/* 1. Candidate Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {lead.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {lead.leadId} {lead.location ? `• ${lead.location}` : ''}
                        </div>
                      </td>

                      {/* 2. Position Applied */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl">
                          {lead.serviceInterested || 'Candidate'}
                        </span>
                      </td>

                      {/* 3. Phone & Quick Links */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={() => handleStartCall(lead)}
                            className="font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center space-x-1"
                            title="Click to dial"
                          >
                            <span>{lead.phone}</span>
                          </a>
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:opacity-80 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Assigned Caller (Admin can assign; HR sees read-only) */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <select
                            value={lead.assignedTo?._id || lead.assignedTo?.id || ''}
                            onChange={e =>
                              assignLeadMutation.mutate({
                                id: lead._id || lead.id,
                                assignedTo: e.target.value
                              })
                            }
                            className="text-[11px] font-bold py-1 px-2 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                          >
                            <option value="">-- Unassigned --</option>
                            {callersData.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {assigneeName ? (
                              lead.assignedTo?._id === user?.id || lead.assignedTo?.id === user?.id
                                ? 'Assigned to You'
                                : assigneeName
                            ) : (
                              'Unassigned'
                            )}
                          </span>
                        )}
                      </td>

                      {/* 5. Last Call & Outcome */}
                      <td className="py-3.5 px-4">
                        {lead.lastCall ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <span>{lead.lastCall.outcome}</span>
                              {lead.lastCall.duration > 0 && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({Math.floor(lead.lastCall.duration / 60)}m {lead.lastCall.duration % 60}s)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                              {lead.lastCall.source === 'android_sim_sync' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  📱 Mobile APK Sync
                                </span>
                              ) : (
                                <span>💻 Web Call</span>
                              )}
                              <span>• {new Date(lead.lastCall.date).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No calls logged yet</span>
                        )}
                      </td>

                      {/* 6. Candidate Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status || 'New'}
                          onChange={e =>
                            updateStatusMutation.mutate({
                              id: lead._id || lead.id,
                              status: e.target.value
                            })
                          }
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer ${lead.status === 'Interview Scheduled'
                            ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                            : lead.status === 'Interested'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : lead.status === 'Selected'
                                ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300'
                                : lead.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                  : lead.status === 'Callback'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Interested">Interested</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Callback">Callback</option>
                          <option value="Selected">Selected</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      {/* 7. Action: Calling & History */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Call Now Button */}
                          <button
                            onClick={() => handleStartCall(lead)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition"
                            title="Call candidate"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            <span>Call</span>
                          </button>

                          {/* Call History Button */}
                          <button
                            onClick={() => setHistoryModalLead(lead)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 transition"
                            title="View Call History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: CALL LOGGING / OUTCOME MODAL --- */}
      {callModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <PhoneCall className="h-5 w-5 text-emerald-500" />
                  <span>Log Call Outcome: {callModalLead.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
                  Phone: {callModalLead.phone} • {callModalLead.serviceInterested}
                </p>
              </div>
              <button
                onClick={() => setCallModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                logCallMutation.mutate({
                  id: callModalLead._id || callModalLead.id,
                  payload: {
                    outcome: callOutcome,
                    duration: callDuration,
                    notes: callNotes,
                    nextFollowUp: nextFollowUpDate || undefined
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Call Outcome Buttons */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Call Outcome / Result *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Connected', val: 'Connected' },
                    { label: 'Interview Scheduled', val: 'Interview Scheduled' },
                    { label: 'Interested', val: 'Interested' },
                    { label: 'Callback', val: 'Callback' },
                    { label: 'Selected', val: 'Selected' },
                    { label: 'Rejected', val: 'Rejected' },
                    { label: 'No Answer', val: 'No Answer' },
                    { label: 'Busy', val: 'Busy' }
                  ].map(item => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setCallOutcome(item.val)}
                      className={`p-2 rounded-xl text-center font-bold text-[11px] border transition ${callOutcome === item.val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:bg-slate-100'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Duration in seconds */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Call Duration: {Math.floor(callDuration / 60)}m {callDuration % 60}s
                </label>
                <div className="flex items-center space-x-2">
                  {[30, 60, 120, 300, 600].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCallDuration(s)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold ${callDuration === s
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    value={callDuration}
                    onChange={e => setCallDuration(Number(e.target.value))}
                    className="w-20 p-1 rounded-lg border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-900 dark:text-white font-mono text-center"
                    placeholder="Seconds"
                  />
                </div>
              </div>

              {/* If Interview Scheduled or Callback, show date/time input */}
              {(callOutcome === 'Interview Scheduled' || callOutcome === 'Callback') && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {callOutcome === 'Interview Scheduled'
                      ? 'Interview Date & Time *'
                      : 'Scheduled Callback Time *'}
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={e => setNextFollowUpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Call Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Conversation Remarks & Notes
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  placeholder="e.g. Candidate answered positively. Has 2 years B2B telecalling experience. Scheduled interview for Thursday."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setCallModalLead(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logCallMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-500/20"
                >
                  {logCallMutation.isPending ? 'Saving...' : 'Save Call & Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CALL HISTORY DRAWER (Includes Mobile SIM Sync APK Logs) --- */}
      {historyModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <History className="h-5 w-5 text-blue-600" />
                  <span>Call History: {historyModalLead.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
                  Phone: {historyModalLead.phone} • {historyModalLead.serviceInterested}
                </p>
              </div>
              <button
                onClick={() => setHistoryModalLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {isLoadingHistory ? (
                <p className="text-center py-8 text-slate-400">Loading call history...</p>
              ) : callHistoryData.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-dark-600" />
                  <p>No call logs found for this candidate.</p>
                  <p className="text-[11px] mt-1">Calls made via Web or the Android SIM Sync APK will appear here.</p>
                </div>
              ) : (
                callHistoryData.map((log: any) => {
                  const isApkSync = log.channelDetails?.source === 'android_sim_sync';
                  return (
                    <div
                      key={log._id || log.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-dark-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {log.outcome || 'Call'}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md ${isApkSync
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                          >
                            {isApkSync ? '📱 Mobile SIM Sync' : '💻 Web Dialer'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.date).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-300 text-xs">
                        {log.notes || 'Call recorded successfully.'}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-dark-700 text-[10px] text-slate-400">
                        <span>Duration: {log.channelDetails?.callDuration || 0}s</span>
                        <span>
                          Caller: {log.assignedTo?.firstName ? `${log.assignedTo.firstName} ${log.assignedTo.lastName}` : 'HR Staff'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex justify-end">
              <button
                onClick={() => setHistoryModalLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD HR LEAD MODAL (ADMIN ONLY) --- */}
      {showAddLeadModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 rounded-3xl border border-slate-200 dark:border-dark-800 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  <span>Add New HR Candidate Lead</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
                  Admin Only: Leads added here will be assigned exclusively to HR calling staff.
                </p>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                createLeadMutation.mutate(newLead);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="e.g. Ankit Verma"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newLead.phone}
                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="candidate@gmail.com"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Position Applied *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLead.serviceInterested}
                    onChange={e => setNewLead({ ...newLead, serviceInterested: e.target.value })}
                    placeholder="e.g. Telecalling Executive"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign To HR Caller
                  </label>
                  <select
                    value={newLead.assignedTo}
                    onChange={e => setNewLead({ ...newLead, assignedTo: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">-- Unassigned (Assign Later) --</option>
                    {callersData.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newLead.priority}
                    onChange={e => setNewLead({ ...newLead, priority: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Location
                  </label>
                  <input
                    type="text"
                    value={newLead.location}
                    onChange={e => setNewLead({ ...newLead, location: e.target.value })}
                    placeholder="e.g. Noida / Delhi"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Experience / Resume Remarks
                </label>
                <textarea
                  rows={3}
                  value={newLead.notes}
                  onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="e.g. 2 years experience in financial loan telecalling. Current CTC ₹25,000. Available to join within 7 days."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-500/20"
                >
                  {createLeadMutation.isPending ? 'Creating...' : 'Create & Assign HR Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
