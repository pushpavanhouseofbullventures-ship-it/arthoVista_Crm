import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { 
  Zap, Phone, Mail, MessageSquare, Instagram, 
  CheckCircle2, Users, Play
} from 'lucide-react';

export const SequencesManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hot' | 'warm' | 'cold'>('hot');
  const [enrollingLeadId, setEnrollingLeadId] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // 1. Fetch Sequences
  const { data: sequencesData, isLoading } = useQuery({
    queryKey: ['outreach-sequences'],
    queryFn: async () => {
      const res = await api.get('/outreach/sequences');
      return res.data.data || [];
    }
  });

  // 2. Fetch Leads for manual enrollment
  const { data: leadsData } = useQuery({
    queryKey: ['leads-enrollment'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data.data || [];
    }
  });

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: async ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) => {
      const res = await api.post('/outreach/sequences/enroll', { leadId, sequenceId });
      return res.data;
    },
    onSuccess: (data) => {
      setEnrollSuccess(`Lead enrolled in ${data.data?.sequenceName} with ${data.data?.totalStepsScheduled} scheduled touchpoints!`);
      setTimeout(() => setEnrollSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
    }
  });

  const activeSequence = (sequencesData || []).find((s: any) => s.leadTemperature === activeTab) || (sequencesData || [])[0];

  const handleEnrollLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollingLeadId || !activeSequence) return;
    enrollMutation.mutate({ leadId: enrollingLeadId, sequenceId: activeSequence._id });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="h-4 w-4" />
            <span>Automated Cadence Builder</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Multi-Channel Follow-up Sequences</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
            Automated lead-temperature based multi-channel workflows across WhatsApp, Email, Instagram, and Phone / Call.
          </p>
        </div>
      </div>

      {/* Temperature Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-dark-800 pb-3">
        <button
          onClick={() => setActiveTab('hot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'hot'
              ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
              : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-dark-300 hover:bg-slate-50'
          }`}
        >
          <span>🔥 Hot Lead Strategy</span>
        </button>

        <button
          onClick={() => setActiveTab('warm')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'warm'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-dark-300 hover:bg-slate-50'
          }`}
        >
          <span>☀️ Warm Lead Strategy</span>
        </button>

        <button
          onClick={() => setActiveTab('cold')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'cold'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-dark-300 hover:bg-slate-50'
          }`}
        >
          <span>❄️ Cold Lead Strategy</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading sequences...</div>
      ) : activeSequence ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Visual Timeline of Steps */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-dark-900 p-6 rounded-3xl border border-slate-200 dark:border-dark-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeSequence.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">{activeSequence.description}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Active Cadence
                </span>
              </div>

              {/* Steps Visual Timeline */}
              <div className="relative pl-6 border-l-2 border-slate-200 dark:border-dark-700 space-y-6 pt-2">
                {(activeSequence.steps || []).map((step: any, index: number) => {
                  const ch = step.channel;
                  return (
                    <div key={index} className="relative">
                      {/* Timeline Node Icon */}
                      <div className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full border-2 border-white dark:border-dark-900 flex items-center justify-center shadow-md ${
                        ch === 'whatsapp' ? 'bg-emerald-500 text-white' :
                        ch === 'email' ? 'bg-blue-500 text-white' :
                        ch === 'instagram' ? 'bg-fuchsia-500 text-white' :
                        'bg-amber-500 text-slate-950'
                      }`}>
                        {ch === 'whatsapp' ? <MessageSquare className="h-3.5 w-3.5" /> :
                         ch === 'email' ? <Mail className="h-3.5 w-3.5" /> :
                         ch === 'instagram' ? <Instagram className="h-3.5 w-3.5" /> :
                         <Phone className="h-3.5 w-3.5" />}
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {step.title}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-dark-300 uppercase">
                            Day {step.delayDays}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-dark-300">
                          {ch === 'phone' ? (
                            <span>📞 <strong>Call Objective:</strong> {step.callObjective}</span>
                          ) : ch === 'email' ? (
                            <span>✉️ <strong>MailerCloud Template:</strong> {step.templateSubject}</span>
                          ) : (
                            <span>💬 <strong>WhatsApp Message:</strong> "{step.templateBody}"</span>
                          )}
                        </p>

                        {step.talkingPoints && step.talkingPoints.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-dark-400 pt-1 border-t border-slate-200 dark:border-dark-700">
                            <span className="font-bold">Talking Points:</span> {step.talkingPoints.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 1 Col: Enrollment & Controls */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 font-bold text-sm">
                <Users className="h-4 w-4" />
                <span>Manual Lead Enrollment</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-400">
                Enroll an active lead into this {activeTab.toUpperCase()} sequence to auto-schedule all {activeSequence.steps?.length} touchpoints.
              </p>

              {enrollSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{enrollSuccess}</span>
                </div>
              )}

              <form onSubmit={handleEnrollLead} className="space-y-3">
                <select
                  value={enrollingLeadId}
                  onChange={(e) => setEnrollingLeadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none"
                  required
                >
                  <option value="">Select a lead to enroll...</option>
                  {(leadsData || []).map((l: any) => (
                    <option key={l._id} value={l._id}>
                      {l.name} ({l.phone || l.email}) - {l.scoreCategory.toUpperCase()}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={enrollMutation.isPending || !enrollingLeadId}
                  className="w-full py-2.5 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Enroll in {activeTab.toUpperCase()} Sequence</span>
                </button>
              </form>
            </div>

            {/* Sequence Rules Card */}
            <div className="bg-slate-50 dark:bg-dark-900/50 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 text-xs space-y-2.5">
              <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">
                Automation Safeguards
              </h4>
              <div className="flex items-center space-x-2 text-slate-600 dark:text-dark-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Auto-stop sequence when client replies</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600 dark:text-dark-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Auto-stop sequence on deal conversion</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600 dark:text-dark-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Consent verified before each touchpoint</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
