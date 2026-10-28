import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import {
  Smartphone,
  Activity, PhoneCall, PhoneIncoming, PhoneOutgoing,
  RefreshCw, Users, Search,
  Clock, X, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function formatTalkTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export const MobileSyncHub: React.FC = () => {
  const userRole = useAuthStore((state) => {
    const currentOrgId = state.activeOrganizationId;
    const currentOrg = state.organizations.find(o => o.id === currentOrgId);
    return currentOrg?.role || 'Sale Executive';
  });
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id;
  const isPrivileged = ['Admin', 'Super Admin', 'Manager'].includes(userRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(currentUser?.email || '');

  // Filters State
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [latestOnly, setLatestOnly] = useState(true);

  // 1. Fetch Sales Reps / Employees master list for filtering
  const { data: repsData } = useQuery({
    queryKey: ['employees-master-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/assignment/config');
        return res.data.data?.reps || [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  // 2. Fetch live synced mobile call logs (server-filtered by employeeId if provided)
  const { data: logsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['mobile-sync-logs', selectedEmployee],
    queryFn: async () => {
      const res = await api.get('/mobile-sync/logs', {
        params: {
          employeeId: selectedEmployee || undefined
        }
      });
      return res.data.data || [];
    },
    refetchInterval: 10000 // auto-refresh every 10s
  });

  const rawLogs: any[] = logsData || [];

  // Total call counts per contact across raw logs
  const callCountMap = useMemo(() => {
    const map = new Map<string, number>();
    rawLogs.forEach((log) => {
      const key = log.leadId?._id || log.leadId?.id || log.customerId?._id || log.customerId?.id || (log.channelDetails?.phoneNumber || log.phoneNumber || '').trim().replace(/\D/g, '') || log._id || log.id;
      if (key) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [rawLogs]);

  // Client-side quick search & outcome filtering with latestOnly deduplication
  const filteredLogs = useMemo(() => {
    const matched = rawLogs.filter((log) => {
      // Search query (phone, lead name, contact name, sales rep name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const phone = (log.channelDetails?.phoneNumber || log.phoneNumber || '').toLowerCase();
        const leadName = (log.leadId?.name || '').toLowerCase();
        const leadCode = (log.leadId?.leadId || '').toLowerCase();
        const customerName = (log.customerId?.name || '').toLowerCase();
        const repName = log.assignedTo ? `${log.assignedTo.firstName || ''} ${log.assignedTo.lastName || ''}`.toLowerCase() : '';
        const notes = (log.notes || '').toLowerCase();

        const matches = phone.includes(q) ||
          leadName.includes(q) ||
          leadCode.includes(q) ||
          customerName.includes(q) ||
          repName.includes(q) ||
          notes.includes(q);

        if (!matches) return false;
      }

      // Outcome Filter
      if (outcomeFilter !== 'ALL') {
        const out = log.outcome || '';
        const dur = Number(log.channelDetails?.callDuration) || 0;
        if (outcomeFilter === 'Connected') {
          if (!['Connected', 'Interested', 'Converted', 'Call Back Later'].includes(out) && dur <= 0) return false;
        } else if (outcomeFilter === 'No Answer') {
          if (out !== 'No Answer') return false;
        } else if (outcomeFilter === 'Missed') {
          if (!['Missed / Rejected', 'Missed', 'Rejected', 'Busy'].includes(out)) return false;
        }
      }

      return true;
    });

    // Ensure sorted by date descending (most recent first)
    matched.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

    // When latestOnly is active (default), show only the latest call log per lead/customer/number
    if (latestOnly) {
      const seen = new Set<string>();
      return matched.filter((log) => {
        const key = log.leadId?._id || log.leadId?.id || log.customerId?._id || log.customerId?.id || (log.channelDetails?.phoneNumber || log.phoneNumber || '').trim().replace(/\D/g, '') || log._id || log.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return matched;
  }, [rawLogs, searchQuery, outcomeFilter, latestOnly]);

  // Aggregate Metrics for currently viewed feed
  const metrics = useMemo(() => {
    const totalCalls = filteredLogs.length;
    let connectedCalls = 0;
    let totalDuration = 0;

    filteredLogs.forEach((log) => {
      const dur = Number(log.channelDetails?.callDuration) || 0;
      totalDuration += dur;
      if (log.outcome === 'Connected' || dur > 0) {
        connectedCalls++;
      }
    });

    const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
    return {
      totalCalls,
      connectedCalls,
      totalDuration,
      connectRate
    };
  }, [filteredLogs]);

  // Selected Employee display name
  const selectedRepObj = useMemo(() => {
    if (!selectedEmployee) return null;
    if (selectedEmployee === currentUserId) {
      return {
        user: currentUser,
        role: userRole
      };
    }
    if (!repsData) return null;
    return repsData.find((r: any) => (r.user?._id || r.user?.id) === selectedEmployee);
  }, [selectedEmployee, repsData, currentUserId, currentUser, userRole]);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const apkDownloadUrl = '/api/download/apk';
  const ipaDownloadUrl = '/api/download/ipa';
  const iosProjDownloadUrl = '/api/download/ios-project';
  const serverDisplayUrl = `http://${currentHost}:5000`;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden border border-slate-200 dark:border-dark-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 btn-tri-45">
        {/* Subtle Ambient 45-deg orbs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#fe7c02]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 -mb-16 w-64 h-64 bg-[#028825]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] p-0.5 shadow-sm flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-white dark:bg-dark-900 rounded-[12px] flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white">
              Mobile SIM Call Sync Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 z-10">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-700 dark:text-dark-200 font-bold text-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* 2. Setup Steps & Instructions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fe7c02] to-amber-600 text-white font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">Install Companion App</h3>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <a
              href={apkDownloadUrl}
              download="ArthoVista-CRM-Sync-v1.0.1-FIXED.apk"
              className="inline-flex items-center space-x-1 text-xs font-bold text-white btn-green-45 px-2.5 py-1.5 rounded-xl transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Android APK</span>
            </a>
            <a
              href={ipaDownloadUrl}
              download="ArthoVistaCRMSync.ipa"
              className="inline-flex items-center space-x-1 text-xs font-bold text-white btn-blue-45 px-2.5 py-1.5 rounded-xl transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>iOS IPA</span>
            </a>
            <a
              href={iosProjDownloadUrl}
              download="ArthoVistaCRMSync-iOS-Project.zip"
              className="inline-flex items-center space-x-1 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-xl transition shadow-sm"
              title="Download full Xcode Project Zip for Mac"
            >
              <span>📁 Xcode Zip</span>
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">Enter Server, Email, Password & Login</h3>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800 text-[11px] font-mono text-slate-700 dark:text-dark-300 break-all">
            Server: {serverDisplayUrl}
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-5 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-black text-xs flex items-center justify-center">3</span>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">Call via SIM (₹0)</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-400">
              When calls end on the phone, the app automatically posts duration, outcome, and timestamp to the lead's timeline.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Live Synced Calls Feed & Employee Filter Hub */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">

        {/* Card Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <h2 className="text-base font-black text-slate-800 dark:text-white">
                Live SIM Synced Call Feed
              </h2>
              {isFetching && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-primary-500 animate-pulse">
                  <span>• Updating</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Badges & Latest Only Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle Pill: Latest Call Only vs All History */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setLatestOnly(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${latestOnly
                  ? 'btn-blue-45 text-white shadow-sm'
                  : 'text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                title="Only show the most recent call log for each lead/customer"
              >
                Latest Call Only
              </button>
              <button
                type="button"
                onClick={() => setLatestOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${!latestOnly
                  ? 'btn-blue-45 text-white shadow-sm'
                  : 'text-slate-600 dark:text-dark-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                title="Show all historical call logs"
              >
                All History ({rawLogs.length})
              </button>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/60 dark:border-dark-700/60 flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Calls Synced:</span>
              <span className="font-black text-primary-600 dark:text-primary-400">{metrics.totalCalls}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/60 dark:border-dark-700/60 flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Connected:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                {metrics.connectedCalls} <span className="text-[10px] font-medium opacity-75">({metrics.connectRate}%)</span>
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200/60 dark:border-dark-700/60 flex items-center space-x-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-slate-400 font-bold uppercase text-[10px]">Talk Time:</span>
              <span className="font-black text-slate-800 dark:text-white">{formatTalkTime(metrics.totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar (Employee Filter, Search, Outcome Filter) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200/60 dark:border-dark-700/60">

          {/* Employee Selector for all team members & executives */}
          <div className="sm:col-span-2 lg:col-span-5 flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 text-slate-500 dark:text-dark-300">
              <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              {isPrivileged ? (
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">🌐 All Organization Calls (Entire Team History)</option>
                  {currentUserId && (
                    <option value={currentUserId}>
                      👤 My Calls Only ({currentUser?.firstName || 'Me'} {currentUser?.lastName || ''})
                    </option>
                  )}
                  {(repsData || [])
                    .filter((rep: any) => (rep.user?._id || rep.user?.id) !== currentUserId)
                    .map((rep: any) => {
                      const u = rep.user;
                      if (!u) return null;
                      const repId = u._id || u.id;
                      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                      const roleLabel = rep.role ? `[${rep.role}]` : '';
                      return (
                        <option key={repId} value={repId}>
                          {name} {roleLabel} ({u.email})
                        </option>
                      );
                    })}
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between shadow-2xs">
                  <span>👤 My Assigned Leads Calls ({currentUser?.firstName || 'Me'} {currentUser?.lastName || ''})</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                    Assigned Only
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Search */}
          <div className="sm:col-span-1 lg:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contact, phone or lead..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-dark-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Outcome Filter */}
          <div className="sm:col-span-1 lg:col-span-3">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-xs font-bold text-slate-700 dark:text-dark-200 outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="ALL">All Outcomes</option>
              <option value="Connected">✅ Connected Calls</option>
              <option value="No Answer">⏳ No Answer</option>
              <option value="Missed">❌ Missed / Rejected</option>
            </select>
          </div>
        </div>

        {/* Selected Employee Filter Status Banner */}
        {selectedRepObj && (
          <div className="p-3 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
              <span className="text-slate-600 dark:text-dark-300">Filtered by Employee:</span>
              <span className="font-black text-primary-700 dark:text-primary-300">
                {selectedRepObj.user?.firstName} {selectedRepObj.user?.lastName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 text-[10px] font-bold">
                {selectedRepObj.role || 'Employee'}
              </span>
              <span className="text-slate-400 text-[11px]">({selectedRepObj.user?.email})</span>
            </div>

            <button
              onClick={() => setSelectedEmployee('')}
              className="text-xs font-bold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 hover:underline"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Table Content */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary-500" />
            <p className="font-bold text-slate-600 dark:text-dark-300">Loading call history...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <PhoneCall className="h-10 w-10 text-slate-300 dark:text-dark-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-dark-200">
              {selectedEmployee ? 'No call history found for this employee' : 'No SIM Calls Synced Yet'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {selectedEmployee
                ? 'This sales agent hasn\'t synced any phone calls via the Android companion app yet, or matches no current search filters.'
                : 'Download and install the Android APK onto your phone to start synchronizing calls automatically.'}
            </p>
            {(selectedEmployee || searchQuery || outcomeFilter !== 'ALL') ? (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSelectedEmployee('');
                    setSearchQuery('');
                    setOutcomeFilter('ALL');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-xs font-bold text-slate-700 dark:text-dark-200 hover:bg-slate-200 transition"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="pt-2 flex items-center justify-center space-x-3">
                <a
                  href={apkDownloadUrl}
                  download="ArthoVista-CRM-Sync-v1.0.1-FIXED.apk"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Android APK</span>
                </a>
                <a
                  href={ipaDownloadUrl}
                  download="ArthoVistaCRMSync.ipa"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md"
                >
                  <Download className="h-4 w-4" />
                  <span>Download iOS IPA</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-dark-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-600 dark:text-dark-300">
              <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Lead / Customer</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3">SIM Slot</th>
                  <th className="p-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                {filteredLogs.map((log: any) => (
                  <tr key={log._id || log.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition">
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        {log.channelDetails?.callType === 'INCOMING' ? (
                          <span className="p-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <PhoneIncoming className="h-3.5 w-3.5" />
                          </span>
                        ) : log.channelDetails?.callType === 'MISSED' ? (
                          <span className="p-1 rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                            <PhoneCall className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <PhoneOutgoing className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="font-bold text-[10px] uppercase">
                          {log.channelDetails?.callType || 'OUTGOING'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 font-semibold text-slate-800 dark:text-dark-200">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 font-black text-[9px] flex items-center justify-center">
                          {log.assignedTo?.firstName ? log.assignedTo.firstName[0].toUpperCase() : 'A'}
                        </span>
                        <span>{log.assignedTo?.firstName ? `${log.assignedTo.firstName} ${log.assignedTo.lastName || ''}`.trim() : 'Sales Agent'}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {log.leadId ? (
                          <Link to={`/crm/leads/${log.leadId._id || log.leadId.id}`} className="font-bold text-primary-600 hover:underline">
                            {log.leadId.name} {log.leadId.leadId && <span className="text-[10px] font-mono text-slate-400">({log.leadId.leadId})</span>}
                          </Link>
                        ) : log.customerId ? (
                          <span className="font-bold text-purple-600">{log.customerId.name} (Customer)</span>
                        ) : (
                          <span className="text-slate-400 font-medium">Unlinked Lead</span>
                        )}
                        {latestOnly && (() => {
                          const key = log.leadId?._id || log.leadId?.id || log.customerId?._id || log.customerId?.id || (log.channelDetails?.phoneNumber || log.phoneNumber || '').trim().replace(/\D/g, '') || log._id || log.id;
                          const count = key ? callCountMap.get(key) || 1 : 1;
                          if (count > 1) {
                            return (
                              <span
                                className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-black border border-blue-200 dark:border-blue-800"
                                title={`Most recent of ${count} calls synced for this contact`}
                              >
                                Latest ({count} calls)
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    <td className="p-3 font-mono font-medium">
                      {log.channelDetails?.phoneNumber || log.phoneNumber || '—'}
                    </td>

                    <td className="p-3 font-bold text-slate-800 dark:text-white">
                      {log.channelDetails?.callDuration ? `${log.channelDetails.callDuration}s` : '0s'}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${['Connected', 'Interested', 'Converted'].includes(log.outcome) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        ['Missed / Rejected', 'Missed', 'Rejected', 'Busy'].includes(log.outcome) ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          'bg-slate-100 text-slate-600 dark:bg-dark-800 dark:text-dark-400'
                        }`}>
                        {log.outcome || 'Logged'}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 font-mono text-[10px] font-bold">
                        SIM {log.channelDetails?.simSlot || 1}
                      </span>
                    </td>

                    <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.date || log.createdAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
