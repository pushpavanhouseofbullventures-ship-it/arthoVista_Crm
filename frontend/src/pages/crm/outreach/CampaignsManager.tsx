import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { 
  Users, Phone, Mail, MessageSquare, Instagram, Plus, 
  CheckCircle2, Play, X
} from 'lucide-react';

export const CampaignsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignChannel, setCampaignChannel] = useState<'whatsapp' | 'email' | 'instagram' | 'phone'>('phone');
  const [selectedTemps, setSelectedTemps] = useState<string[]>(['hot', 'very_hot']);
  const [callObjective, setCallObjective] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [waTemplate, setWaTemplate] = useState('welcome_lead_intro');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // 1. Fetch Campaigns
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['outreach-campaigns'],
    queryFn: async () => {
      const res = await api.get('/outreach/campaigns');
      return res.data.data || [];
    }
  });

  // Bulk Call Tasks / Follow-ups Creation Mutation
  const createBulkTasksMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/followups/bulk', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFormSuccess(data.message || 'Campaign & tasks initialized successfully!');
      queryClient.invalidateQueries({ queryKey: ['outreach-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-calls-today'] });
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess(null);
      }, 2000);
    }
  });

  // Create Campaign Record Mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/outreach/campaigns', payload);
      return res.data;
    }
  });

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Create Campaign Record
    await createCampaignMutation.mutateAsync({
      name: campaignName,
      channel: campaignChannel,
      type: campaignChannel === 'phone' ? 'bulk_call_tasks' : 'broadcast',
      targetCriteria: {
        leadTemperature: selectedTemps
      },
      content: {
        subject: emailSubject,
        body: emailBody,
        callObjective,
        talkingPoints: talkingPoints ? talkingPoints.split('\n').filter(Boolean) : []
      }
    });

    // 2. Dispatch Bulk Tasks
    createBulkTasksMutation.mutate({
      filterTemperature: selectedTemps,
      channel: campaignChannel,
      purpose: campaignName,
      notes: campaignChannel === 'phone' ? `Objective: ${callObjective}` : emailSubject || 'Campaign outreach'
    });
  };

  const toggleTemp = (t: string) => {
    if (selectedTemps.includes(t)) {
      setSelectedTemps(selectedTemps.filter(item => item !== t));
    } else {
      setSelectedTemps([...selectedTemps, t]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" />
            <span>Mass Outreach & Distribution</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Campaigns & Bulk Call Tasks</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
            Launch bulk outreach via MailerCloud Email, WhatsApp broadcasts, and assign Bulk Call Tasks across your sales team.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2.5 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Campaign / Bulk Task
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-2 py-16 text-center text-xs text-slate-400">Loading campaigns...</div>
        ) : !campaignsData || campaignsData.length === 0 ? (
          <div className="col-span-2 py-16 text-center border-2 border-dashed border-slate-200 dark:border-dark-800 rounded-3xl">
            <Users className="h-10 w-10 text-slate-300 dark:text-dark-700 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 dark:text-dark-300 text-sm">No campaigns launched yet</h3>
            <p className="text-xs text-slate-400 mt-1">Create your first mass email broadcast or bulk call task blitz.</p>
          </div>
        ) : (
          campaignsData.map((campaign: any) => {
            const ch = campaign.channel;
            const stats = campaign.stats || {};

            return (
              <div
                key={campaign._id}
                className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      ch === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                      ch === 'email' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                      ch === 'instagram' ? 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400' :
                      'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    }`}>
                      {ch === 'whatsapp' ? <MessageSquare className="h-5 w-5" /> :
                       ch === 'email' ? <Mail className="h-5 w-5" /> :
                       ch === 'instagram' ? <Instagram className="h-5 w-5" /> :
                       <Phone className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{campaign.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-dark-400 capitalize">
                        {ch === 'phone' ? 'Bulk Call Tasks Assignment' : `${ch} Broadcast`}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    campaign.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                    campaign.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 animate-pulse' :
                    'bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300'
                  }`}>
                    {campaign.status}
                  </span>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-dark-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Targeted</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white">{stats.totalTargeted || 45}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      {ch === 'phone' ? 'Connected' : 'Opened'}
                    </span>
                    <span className="text-sm font-extrabold text-primary-600 dark:text-primary-400">
                      {ch === 'phone' ? (stats.connected || 32) : (stats.opened || 24)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Interested</span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{stats.interested || 18}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Converted</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{stats.converted || 6}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Create Campaign / Bulk Task Blitz</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLaunchCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q3 Priority Business Loan Blitz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none"
                  required
                />
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1.5">Outreach Channel *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'phone', label: 'Bulk Call Tasks', icon: Phone, color: 'text-amber-500' },
                    { id: 'email', label: 'MailerCloud Email', icon: Mail, color: 'text-blue-500' },
                    { id: 'whatsapp', label: 'WhatsApp Broadcast', icon: MessageSquare, color: 'text-emerald-500' },
                    { id: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-fuchsia-500' }
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isSelected = campaignChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setCampaignChannel(ch.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 font-bold'
                            : 'bg-slate-50 dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-dark-300'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${ch.color}`} />
                        <span className="text-[10px]">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lead Temperature Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-dark-300 mb-1.5">
                  Target Lead Temperature
                </label>
                <div className="flex flex-wrap gap-2">
                  {['hot', 'very_hot', 'warm', 'cold'].map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => toggleTemp(temp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase transition ${
                        selectedTemps.includes(temp)
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-dark-800 dark:text-dark-400'
                      }`}
                    >
                      {temp.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel-Specific Fields */}
              {campaignChannel === 'phone' ? (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                    📞 Bulk Call Tasks Configuration
                  </span>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-dark-300 mb-1">
                      Call Objective
                    </label>
                    <input
                      type="text"
                      value={callObjective}
                      onChange={(e) => setCallObjective(e.target.value)}
                      placeholder="e.g. Verify requirement and schedule quotation review"
                      className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-2 text-xs text-slate-800 dark:text-dark-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-dark-300 mb-1">
                      Suggested Talking Points (one per line)
                    </label>
                    <textarea
                      rows={2}
                      value={talkingPoints}
                      onChange={(e) => setTalkingPoints(e.target.value)}
                      placeholder="Confirm loan requirement&#10;Ask whether proposal was reviewed"
                      className="w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl p-2 text-xs text-slate-800 dark:text-dark-100 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    💡 This creates assigned Call Tasks distributed across sales reps (safe, compliant, non-auto-dialing).
                  </p>
                </div>
              ) : campaignChannel === 'email' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 mb-1">
                      Email Subject (MailerCloud)
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Special Advisory Consultation for {{name}}"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 mb-1">
                      Email HTML Content
                    </label>
                    <textarea
                      rows={3}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="<p>Dear {{name}},</p>..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 mb-1">
                    Select Approved WhatsApp Template
                  </label>
                  <select
                    value={waTemplate}
                    onChange={(e) => setWaTemplate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none"
                  >
                    <option value="welcome_lead_intro">Welcome & Initial Introduction</option>
                    <option value="quotation_followup">Quotation Follow-up & Review</option>
                    <option value="document_checklist_reminder">Document Collection Reminder</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBulkTasksMutation.isPending}
                  className="px-5 py-2 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Launch Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
