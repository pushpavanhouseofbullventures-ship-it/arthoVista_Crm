import React, { useState, useEffect, useCallback } from 'react';
import {
  Bug, PlusCircle, Search, RefreshCw,
  Clock, CheckCircle2, Layers, MessageSquare,
  ChevronRight, ShieldAlert, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ReportIssueModal } from '../../features/issues/components/ReportIssueModal';
import { IssueDetailModal } from '../../features/issues/components/IssueDetailModal';

const MODULES_FILTER = [
  { id: 'all', label: 'All Modules' },
  { id: 'lead_management', label: 'Lead Management' },
  { id: 'mobile_sync', label: 'Mobile SIM Sync' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'invoices', label: 'Invoices & Billing' },
  { id: 'ot_pipeline', label: 'OT Pipeline' },
  { id: 'hr', label: 'HR Calling' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'auth', label: 'Login & Permissions' },
  { id: 'general', label: 'General CRM' },
];

export const IssueReportsPage: React.FC = () => {
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find((o) => o.id === activeOrganizationId) || organizations[0];
  const userRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');

  const [issues, setIssues] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'open' | 'resolved'>('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};

      if (activeTab === 'my') {
        params.myIssues = 'true';
      } else if (activeTab === 'open') {
        params.status = 'open';
      } else if (activeTab === 'resolved') {
        params.status = 'resolved';
      }

      if (selectedModule !== 'all') {
        params.module = selectedModule;
      }

      if (selectedSeverity !== 'all') {
        params.severity = selectedSeverity;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/issues', { params });
      if (res.data?.success) {
        setIssues(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedModule, selectedSeverity, searchQuery]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleIssueCreated = (newIssue: any) => {
    fetchIssues();
    if (newIssue?.id) {
      setSelectedIssueId(newIssue.id);
    }
  };

  const handleIssueUpdated = () => {
    fetchIssues();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Open</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Resolved</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-dark-800 dark:text-slate-300 border border-slate-300 dark:border-dark-700">
            <span>Closed</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-200 dark:border-dark-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 shadow-xl border border-slate-800 btn-tri-45">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 text-white bg-black rounded-full border-orange-400/40 text-xs">
              <Bug className="h-3.5 w-3.5" />
              <span>Issue Report Section</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl text-white bg-black hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/30 active:scale-95 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Report An Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Stat KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Reported</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Open / Review</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.open}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">In Progress</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.inProgress}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <RefreshCw className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Resolved</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.resolved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-rose-200/80 dark:border-rose-900/40 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Critical / Urgent</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.critical}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="p-4 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-dark-800 pb-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Issues' },
              { id: 'my', label: 'My Reported Issues' },
              { id: 'open', label: 'Open' },
              { id: 'resolved', label: 'Resolved' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchIssues()}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition self-end sm:self-auto border border-slate-200 dark:border-dark-700"
            title="Refresh issues"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>

        {/* Search & Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by issue ID, title, or reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
            >
              {MODULES_FILTER.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Issue Reports List */}
      <div className="space-y-3">
        {isLoading && issues.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 space-y-3">
            <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Loading issue reports...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 dark:bg-dark-800 text-orange-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              No Issues Found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedModule !== 'all' || selectedSeverity !== 'all'
                ? 'No issues match your current filters. Try resetting search filters.'
                : 'Great news! There are currently no unresolved issues reported in this section.'}
            </p>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Report First Issue</span>
            </button>
          </div>
        ) : (
          issues.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedIssueId(item.id)}
              className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 hover:border-orange-400 dark:hover:border-orange-500/60 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
            >
              {/* Left Accent Stripe based on severity */}
              <span
                className={`absolute left-0 top-0 bottom-0 w-1 ${item.severity === 'critical'
                  ? 'bg-rose-500'
                  : item.severity === 'high'
                    ? 'bg-orange-500'
                    : item.severity === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
              />

              {/* Main Content */}
              <div className="min-w-0 flex-1 space-y-2 pl-2">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs text-orange-600 dark:text-orange-400">
                    {item.issueId}
                  </span>
                  {getStatusBadge(item.status)}
                  {getSeverityBadge(item.severity)}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 capitalize">
                    {item.module.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition truncate">
                  {item.title}
                </h3>

                {/* Description Snippet */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {item.description}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[9px] font-black">
                      {(item.reporterFirstName || 'U').charAt(0)}
                    </span>
                    <span>{item.reporterFirstName} {item.reporterLastName}</span>
                  </div>

                  <span>&bull;</span>

                  <span>
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {item.pageUrl && (
                    <>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-500 truncate max-w-[150px]">
                        {item.pageUrl}
                      </span>
                    </>
                  )}

                  {item.screenshotUrl && (
                    <>
                      <span>&bull;</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        📸 Has Screenshot
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Action & Comments Counter */}
              <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-dark-800">
                <div className="flex items-center space-x-1 text-slate-500 text-xs">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-bold">{item.commentsCount || 0}</span>
                </div>

                <div className="inline-flex items-center space-x-1 text-xs font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform">
                  <span>View Details</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={handleIssueCreated}
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issueId={selectedIssueId}
        isOpen={!!selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={handleIssueUpdated}
        userRole={userRole}
      />
    </div>
  );
};

export default IssueReportsPage;
