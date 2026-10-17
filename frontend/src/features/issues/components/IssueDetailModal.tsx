import React, { useState, useEffect } from 'react';
import {
  X, Bug, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  ExternalLink, MessageSquare, Send, User, Monitor, ChevronRight,
  ShieldCheck, Loader2, Sparkles, Check
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

interface IssueDetailModalProps {
  issueId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedIssue: any) => void;
  userRole?: string;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issueId,
  isOpen,
  onClose,
  onUpdated,
  userRole = 'Sale Executive'
}) => {
  const { user } = useAuthStore();
  const [issue, setIssue] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Status updating state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState('medium');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const isPrivileged = [
    'Admin', 'Super Admin', 'Manager', 'Team Leader', 'TL'
  ].includes(userRole) || user?.email === 'shivamthakur12012@gmail.com';

  useEffect(() => {
    if (isOpen && issueId) {
      loadIssueDetails();
    } else {
      setIssue(null);
      setZoomImage(null);
    }
  }, [isOpen, issueId]);

  const loadIssueDetails = async () => {
    if (!issueId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/issues/${issueId}`);
      if (res.data?.success) {
        const data = res.data.data;
        setIssue(data);
        setStatus(data.status);
        setSeverity(data.severity);
        setResolutionNotes(data.resolutionNotes || '');
      }
    } catch (err) {
      console.error('Failed to load issue details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !issueId) return null;

  const handleUpdateStatus = async (overrideStatus?: string) => {
    setIsUpdatingStatus(true);
    try {
      const payload: any = {
        status: overrideStatus || status,
        severity,
        resolutionNotes: resolutionNotes.trim() || undefined
      };

      const res = await api.patch(`/issues/${issueId}`, payload);
      if (res.data?.success) {
        const updated = res.data.data;
        setIssue((prev: any) => ({
          ...prev,
          ...updated,
          comments: prev?.comments || []
        }));
        setShowResolutionForm(false);
        if (onUpdated) onUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to update issue status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await api.post(`/issues/${issueId}/comments`, {
        comment: newComment.trim()
      });

      if (res.data?.success) {
        const commentObj = res.data.data;
        setIssue((prev: any) => ({
          ...prev,
          comments: [...(prev?.comments || []), commentObj]
        }));
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Open</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>In Progress</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-dark-800 dark:text-slate-300 border border-slate-300 dark:border-dark-700">
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
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-200 dark:border-dark-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between bg-slate-50/70 dark:bg-dark-950/60">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-md flex items-center justify-center text-white flex-shrink-0">
              <Bug className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-extrabold text-sm text-orange-600 dark:text-orange-400">
                  {issue?.issueId || '...'}
                </span>
                {issue && getStatusBadge(issue.status)}
                {issue && getSeverityBadge(issue.severity)}
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5 max-w-lg">
                {issue?.title || 'Loading issue details...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading issue details...</p>
            </div>
          ) : issue ? (
            <>
              {/* Resolution Banner if resolved */}
              {(issue.status === 'resolved' || issue.status === 'closed') && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Issue Marked as {issue.status === 'resolved' ? 'Resolved' : 'Closed'}</span>
                    </div>
                    {issue.resolvedAt && (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {new Date(issue.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {issue.resolutionNotes && (
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 pl-6">
                      <span className="font-semibold">Resolution Note:</span> {issue.resolutionNotes}
                    </p>
                  )}
                  {issue.resolverFirstName && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 pl-6">
                      Handled by: {issue.resolverFirstName} {issue.resolverLastName}
                    </p>
                  )}
                </div>
              )}

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporter</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">
                    {issue.reporterFirstName} {issue.reporterLastName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{issue.reporterEmail}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Module</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-1 capitalize">
                    {issue.module.replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-slate-500 capitalize">{issue.category.replace('_', ' ')}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Affected Route</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300 mt-1 truncate" title={issue.pageUrl || 'N/A'}>
                    {issue.pageUrl || 'N/A'}
                  </p>
                  {issue.pageUrl && (
                    <a
                      href={issue.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 mt-0.5"
                    >
                      <span>Open Page</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Issue Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Issue Description
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {issue.description}
                </div>
              </div>

              {/* Steps to Reproduce */}
              {issue.stepsToReproduce && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Steps to Reproduce
                  </h4>
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {issue.stepsToReproduce}
                  </div>
                </div>
              )}

              {/* Screenshot Attachment */}
              {issue.screenshotUrl && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Attached Screenshot
                  </h4>
                  <div className="relative rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 p-2 overflow-hidden group">
                    <img
                      src={issue.screenshotUrl}
                      alt="Issue screenshot"
                      onClick={() => setZoomImage(issue.screenshotUrl)}
                      className="max-h-72 w-auto object-contain rounded-xl cursor-zoom-in group-hover:opacity-95 transition"
                    />
                    <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Click screenshot to enlarge</span>
                      <a
                        href={issue.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center space-x-1"
                      >
                        <span>Open original</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin / Team Leader Status Updater */}
              {isPrivileged && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/40 dark:from-blue-950/20 dark:via-dark-800/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Admin / Lead Resolution Controls
                      </h4>
                    </div>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                      Role: {userRole}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Change Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="open">Open (Investigating)</option>
                        <option value="in_progress">In Progress (Fixing)</option>
                        <option value="resolved">Resolved (Bug Fixed)</option>
                        <option value="closed">Closed (Done / Non-Issue)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Update Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resolution Notes / Solution Summary
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Fixed null check in SIM sync route. Deployed in patch v1.0.4."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus()}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm active:scale-95 transition disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Status & Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Discussion & Updates Thread */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-dark-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-orange-500" />
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Issue Discussion & Notes ({issue.comments?.length || 0})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Internal Team Thread</span>
                </div>

                {/* Comments List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {(!issue.comments || issue.comments.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800/40 text-center text-xs text-slate-400">
                      No comments or notes yet. You can post an update below.
                    </div>
                  ) : (
                    issue.comments.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-dark-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">
                              {(c.authorFirstName || 'U').charAt(0)}
                            </span>
                            <span>{c.authorFirstName} {c.authorLastName}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 pl-6 whitespace-pre-wrap">
                          {c.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type an update or note on this issue..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-sm disabled:opacity-50 transition active:scale-95 flex items-center space-x-1"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>Reply</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Lightbox zoomed image */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <img
            src={zoomImage}
            alt="Zoomed issue screenshot"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
