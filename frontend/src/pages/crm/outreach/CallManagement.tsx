import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { 
  PhoneCall, PhoneOff, Sparkles, CheckCircle2
} from 'lucide-react';

const CALL_OUTCOMES = [
  'Connected',
  'Interested',
  'Not Interested',
  'Call Back Later',
  'Busy',
  'No Answer',
  'Switched Off',
  'Wrong Number',
  'Converted',
  'Follow-up Required',
  'Other'
];

export const CallManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // Active call modal states
  const [activeCallLead, setActiveCallLead] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'in_progress' | 'logging'>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callTimerInterval, setCallTimerInterval] = useState<any>(null);

  // Call Brief data
  const [callBrief, setCallBrief] = useState<any>(null);
  const [loadingBrief, setLoadingBrief] = useState<boolean>(false);

  // Post-call log form
  const [selectedOutcome, setSelectedOutcome] = useState<string>('Connected');
  const [callNotes, setCallNotes] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [nextFollowUpChannel, setNextFollowUpChannel] = useState<'whatsapp' | 'email' | 'instagram' | 'phone'>('whatsapp');
  const [nextFollowUpPurpose, setNextFollowUpPurpose] = useState<string>('Quotation Follow-up');
  
  // AI Post-Call Assistant states
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  // 1. Fetch Call Dashboard KPIs
  const { data: dashboardData } = useQuery({
    queryKey: ['calls-dashboard'],
    queryFn: async () => {
      const res = await api.get('/outreach/calls/dashboard');
      return res.data.data;
    }
  });

  // 2. Fetch Call Logs History
  const { data: callLogsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['calls-logs'],
    queryFn: async () => {
      const res = await api.get('/outreach/calls/logs');
      return res.data.data;
    }
  });

  // 3. Fetch Today's Scheduled Call Tasks
  const { data: scheduledCallsData, isLoading: loadingScheduled } = useQuery({
    queryKey: ['scheduled-calls-today'],
    queryFn: async () => {
      const res = await api.get('/outreach/followups', {
        params: { channel: 'phone', period: 'today', status: 'pending' }
      });
      return res.data.data;
    }
  });

  // Fetch AI Call Brief when lead selected
  const fetchBriefForLead = async (leadId: string) => {
    try {
      setLoadingBrief(true);
      const res = await api.get(`/outreach/calls/${leadId}/ai-brief`);
      setCallBrief(res.data.data);
    } catch (err) {
      console.error('Failed to load brief', err);
    } finally {
      setLoadingBrief(false);
    }
  };

  // Start Call Trigger
  const handleStartCall = async (lead: any) => {
    setActiveCallLead(lead);
    setCallStatus('calling');
    setCallDuration(0);
    setSelectedOutcome('Connected');
    setCallNotes('');
    setAiAnalysisResult(null);

    // Load AI Brief in background
    fetchBriefForLead(lead._id);

    // Transition to in-progress after 1.5s ring simulation
    setTimeout(() => {
      setCallStatus('in_progress');
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setCallTimerInterval(interval);
    }, 1500);
  };

  // End Call & open log dialog
  const handleEndCall = () => {
    if (callTimerInterval) clearInterval(callTimerInterval);
    setCallStatus('logging');
  };

  // Trigger AI Post-Call Analysis
  const handleTriggerAIAnalysis = async () => {
    if (!callNotes.trim()) {
      alert('Please enter call notes first so AI can analyze the interaction.');
      return;
    }
    try {
      setAiAnalyzing(true);
      const res = await api.post('/outreach/calls/ai-analyze', {
        notes: callNotes,
        outcome: selectedOutcome,
        leadName: activeCallLead?.name || 'Client'
      });
      const analysis = res.data.data;
      setAiAnalysisResult(analysis);

      if (analysis.recommendedChannel) {
        setNextFollowUpChannel(analysis.recommendedChannel);
      }
      if (analysis.suggestedFollowUpDate) {
        setNextFollowUpDate(analysis.suggestedFollowUpDate);
      }
      if (analysis.recommendedNextAction) {
        setNextFollowUpPurpose(analysis.recommendedNextAction);
      }
    } catch (err) {
      console.error('AI analysis error', err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Save Call Mutation
  const saveCallMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/calls/manual', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calls-logs'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-calls-today'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
      setCallStatus('idle');
      setActiveCallLead(null);
    }
  });

  const handleSaveCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallLead) return;

    saveCallMutation.mutate({
      leadId: activeCallLead._id,
      phoneNumber: activeCallLead.phone || activeCallLead.whatsApp || '9876543210',
      duration: callDuration,
      outcome: selectedOutcome,
      notes: callNotes,
      nextFollowUpDate: nextFollowUpDate || undefined,
      nextFollowUpChannel: nextFollowUpChannel,
      nextFollowUpPurpose: nextFollowUpPurpose
    });
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const todayStats = dashboardData?.today || {
    scheduled: 12,
    completed: 8,
    connected: 6,
    noAnswer: 2,
    interested: 4,
    converted: 1,
    followUpRequired: 5,
    averageDurationSeconds: 165,
    conversionRatePercent: 12
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <PhoneCall className="h-4 w-4" />
            <span>Voice Channel Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Call Management & Telephony</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
            Integrated Mode 1 (Manual Logging) + Mode 2 (Telephony) with AI Brief & Post-Call Copilot.
          </p>
        </div>
      </div>

      {/* Call Dashboard KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Today</span>
          <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{todayStats.scheduled}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
          <p className="text-xl font-extrabold text-primary-600 dark:text-primary-400 mt-1">{todayStats.completed}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connected</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{todayStats.connected}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interested</span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{todayStats.interested}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Converted</span>
          <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">{todayStats.converted}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Duration</span>
          <p className="text-xl font-extrabold text-slate-700 dark:text-slate-200 mt-1">{formatTime(todayStats.averageDurationSeconds)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion %</span>
          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{todayStats.conversionRatePercent}%</p>
        </div>
      </div>

      {/* Main Content: Scheduled Calls Queue + Call Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Today's Scheduled Call Tasks */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Today's Call Tasks</h3>
                <p className="text-xs text-slate-500 dark:text-dark-400">Assigned voice follow-up queue</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                {scheduledCallsData?.length || 0} Pending
              </span>
            </div>

            {loadingScheduled ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading call tasks...</div>
            ) : !scheduledCallsData || scheduledCallsData.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700 dark:text-dark-300">All calls completed for today!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduledCallsData.map((task: any) => {
                  const lead = task.leadId;
                  return (
                    <div key={task._id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-800/60 border border-slate-100 dark:border-dark-800 flex items-center justify-between hover:border-amber-400/50 transition">
                      <div className="overflow-hidden pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
                            {lead?.name || 'Inquiry Contact'}
                          </span>
                          {lead?.scoreCategory && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 uppercase">
                              {lead.scoreCategory}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-dark-400 truncate mt-0.5">{task.purpose}</p>
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                          📞 {lead?.phone || 'No phone'} &bull; {task.time}
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartCall(lead)}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm flex items-center space-x-1 flex-shrink-0 transition"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        <span>Call</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Call History & Recorded Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Call History & Logged Dispositions</h3>
                <p className="text-xs text-slate-500 dark:text-dark-400">Complete record of inbound and outbound voice communications</p>
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading call history...</div>
            ) : !callLogsData || callLogsData.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">No call logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Lead / Customer</th>
                      <th className="pb-3">Outcome</th>
                      <th className="pb-3">Duration</th>
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Date & Time</th>
                      <th className="pb-3 pr-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                    {callLogsData.map((log: any) => {
                      const outcome = log.outcome;
                      return (
                        <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition">
                          <td className="py-3 pl-2">
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {log.leadId?.name || log.customerId?.name || log.phoneNumber}
                            </div>
                            <span className="text-[11px] text-slate-400">{log.phoneNumber}</span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full ${
                              outcome === 'Connected' || outcome === 'Interested' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                              outcome === 'Converted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400' :
                              outcome === 'No Answer' || outcome === 'Busy' || outcome === 'Switched Off' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {outcome}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-slate-700 dark:text-dark-300">
                            {formatTime(log.duration || 0)}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-dark-400">
                            {log.employeeId ? `${log.employeeId.firstName} ${log.employeeId.lastName}` : 'Shivam'}
                          </td>
                          <td className="py-3 text-slate-500 dark:text-dark-400">
                            {new Date(log.startTime || log.createdAt).toLocaleDateString()} {new Date(log.startTime || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 pr-2 text-slate-600 dark:text-dark-300 max-w-xs truncate">
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE CALL MODAL (Mode 1 & 2 + Before-Call Brief + Live Timer + Post-Call Copilot) */}
      {callStatus !== 'idle' && activeCallLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header & Status */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
                  callStatus === 'calling' ? 'bg-amber-500 animate-pulse' :
                  callStatus === 'in_progress' ? 'bg-emerald-600 animate-pulse' : 'bg-primary-600'
                }`}>
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeCallLead.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-dark-400">
                    {activeCallLead.phone || '9876543210'} &bull; {activeCallLead.company || 'Client'}
                  </p>
                </div>
              </div>

              {/* Call Timer Display */}
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{formatTime(callDuration)}</span>
              </div>
            </div>

            {/* Before-Call AI Brief Accordion / View */}
            {callBrief ? (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Call Brief & Talking Points</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <strong>Recommended Objective:</strong> {callBrief.recommendedObjective}
                </p>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Suggested Talking Points:</span>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                    {(callBrief.suggestedTalkingPoints || []).map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : loadingBrief ? (
              <div className="p-3 text-center text-xs text-indigo-500 animate-pulse">Generating AI Call Brief...</div>
            ) : null}

            {/* In-Call Controls */}
            {callStatus === 'in_progress' || callStatus === 'calling' ? (
              <div className="py-6 flex flex-col items-center space-y-4">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                  Call in progress. Record notes live or click End Call.
                </p>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Take quick call notes while speaking..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none"
                />
                <button
                  onClick={handleEndCall}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl hover:shadow-red-600/30 transition flex items-center space-x-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call & Classify Outcome</span>
                </button>
              </div>
            ) : null}

            {/* Post-Call Outcome & Next Action Logger Form */}
            {callStatus === 'logging' && (
              <form onSubmit={handleSaveCallLog} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1.5">
                    Select Call Outcome *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CALL_OUTCOMES.map((outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setSelectedOutcome(outcome)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                          selectedOutcome === outcome
                            ? 'btn-blue-45 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 dark:bg-dark-800 dark:text-dark-300 dark:border-dark-700 hover:border-blue-400'
                        }`}
                      >
                        {outcome}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-dark-300">
                      Call Discussion Notes
                    </label>
                    <button
                      type="button"
                      onClick={handleTriggerAIAnalysis}
                      disabled={aiAnalyzing}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{aiAnalyzing ? 'Analyzing...' : 'AI Copilot: Analyze & Auto-fill'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Enter details of what was discussed, objections, agreements..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* AI Suggestions Box */}
                {aiAnalysisResult && (
                  <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 font-bold text-purple-800 dark:text-purple-300">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      <span>AI Analysis & Next Recommendation</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{aiAnalysisResult.summary}</p>
                    <p className="text-purple-700 dark:text-purple-300 font-semibold">
                      Suggested Action: {aiAnalysisResult.recommendedNextAction} via {aiAnalysisResult.recommendedChannel?.toUpperCase()}
                    </p>
                  </div>
                )}

                {/* Next Follow-up Section */}
                <div className="p-4 bg-slate-50 dark:bg-dark-800/80 rounded-2xl space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    Schedule Next Follow-up Checkpoint
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Channel</label>
                      <select
                        value={nextFollowUpChannel}
                        onChange={(e) => setNextFollowUpChannel(e.target.value as any)}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-2 text-xs text-slate-800 dark:text-dark-100 outline-none"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone / Call</option>
                        <option value="email">Email (MailerCloud)</option>
                        <option value="instagram">Instagram</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={nextFollowUpDate}
                        onChange={(e) => setNextFollowUpDate(e.target.value)}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-2 text-xs text-slate-800 dark:text-dark-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Purpose / Action</label>
                      <input
                        type="text"
                        value={nextFollowUpPurpose}
                        onChange={(e) => setNextFollowUpPurpose(e.target.value)}
                        placeholder="e.g. Send WhatsApp quote"
                        className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-2 text-xs text-slate-800 dark:text-dark-100 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-dark-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCallStatus('idle');
                      setActiveCallLead(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saveCallMutation.isPending}
                    className="px-6 py-2.5 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition disabled:opacity-50 active:scale-95"
                  >
                    Save Call Log & Next Follow-up
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
