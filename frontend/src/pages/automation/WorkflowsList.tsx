import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Plus, Loader2, AlertCircle, ToggleLeft, ToggleRight, Trash2, 
  Mail, CheckSquare, Zap
} from 'lucide-react';

interface WorkflowActionConfig {
  actionType: 'send_email' | 'create_task';
  metadata: Record<string, any>;
}

export const WorkflowsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<'lead_created' | 'deal_stage_changed' | 'ticket_created'>('lead_created');
  const [conditionField, setConditionField] = useState('');
  const [conditionOperator, setConditionOperator] = useState<'equals' | 'greater_than' | 'less_than'>('equals');
  const [conditionValue, setConditionValue] = useState('');
  
  const [actions, setActions] = useState<WorkflowActionConfig[]>([
    { actionType: 'create_task', metadata: { title: 'Follow up with client', dueDateOffsetDays: 3 } }
  ]);

  // Fetch Workflows
  const { data: workflows, isLoading, isError } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await api.get('/workflows');
      return response.data.data;
    }
  });

  // Create Workflow Mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/workflows', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to save workflow automation.');
    }
  });

  // Toggle active/inactive
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/workflows/${id}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  // Delete Workflow
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });

  const resetForm = () => {
    setName('');
    setTriggerEvent('lead_created');
    setConditionField('');
    setConditionOperator('equals');
    setConditionValue('');
    setActions([{ actionType: 'create_task', metadata: { title: 'Follow up with client', dueDateOffsetDays: 3 } }]);
    setErrorMsg(null);
  };

  const handleAddActionRow = () => {
    setActions(prev => [...prev, { actionType: 'create_task', metadata: { title: '', dueDateOffsetDays: 3 } }]);
  };

  const handleRemoveActionRow = (idx: number) => {
    if (actions.length === 1) return;
    setActions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleActionMetadataChange = (idx: number, key: string, val: any) => {
    setActions(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        metadata: {
          ...copy[idx].metadata,
          [key]: val
        }
      };
      return copy;
    });
  };

  const handleActionTypeChange = (idx: number, type: 'send_email' | 'create_task') => {
    setActions(prev => {
      const copy = [...prev];
      const defaultMetadata = type === 'create_task' 
        ? { title: 'Call customer', dueDateOffsetDays: 3 }
        : { subject: 'Automated notification alert', body: 'This is an automated workflow message.' };
      copy[idx] = {
        actionType: type,
        metadata: defaultMetadata
      };
      return copy;
    });
  };

  const handleSubmitWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please provide a workflow name.');
      return;
    }

    // Parse condition
    const conditions = [];
    if (conditionField) {
      conditions.push({
        field: conditionField,
        operator: conditionOperator,
        value: conditionValue
      });
    }

    createWorkflowMutation.mutate({
      name,
      triggerEvent,
      conditions,
      actions
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Workflow Automations</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Design event-driven trigger actions. Set rules to automate notifications, tasks, and stage updates.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Rules list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
            <span>Loading automation workflows...</span>
          </div>
        ) : isError || !workflows || workflows.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white dark:bg-dark-900 border rounded-3xl">
            <Zap className="h-8 w-8 mx-auto text-slate-350 dark:text-dark-700 mb-2" />
            <p className="font-semibold text-slate-500 dark:text-dark-400">No active workflows</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-light">Create a new trigger rule to automate follow-ups.</p>
          </div>
        ) : (
          workflows.map((wf: any) => (
            <div key={wf._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{wf.name}</h3>
                    <span className="inline-block mt-1 bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300 px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider">
                      Event: {wf.triggerEvent.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: wf._id, isActive: !wf.isActive })}
                    className="text-slate-400 hover:text-primary-650 transition"
                    title="Toggle active status"
                  >
                    {wf.isActive ? (
                      <ToggleRight className="h-7 w-7 text-primary-650" />
                    ) : (
                      <ToggleLeft className="h-7 w-7" />
                    )}
                  </button>
                </div>

                {/* Condition specs */}
                <div className="text-xs text-slate-500 font-semibold space-y-1.5 pt-2 border-t border-slate-100 dark:border-dark-800">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Execution Rule</span>
                  {wf.conditions.length > 0 ? (
                    wf.conditions.map((cond: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-1 font-mono text-[10px] text-slate-600 dark:text-dark-300">
                        <span className="capitalize">{cond.field}</span>
                        <span className="text-primary-500 font-bold uppercase">{cond.operator.replace('_', ' ')}</span>
                        <span className="bg-slate-50 dark:bg-dark-955 px-1.5 py-0.5 rounded border dark:border-dark-800">{cond.value}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic font-medium">Runs unconditionally on trigger.</span>
                  )}
                </div>

                {/* Action summary cards */}
                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 space-y-2">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Actions triggered</span>
                  {wf.actions.map((act: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-dark-200">
                      {act.actionType === 'create_task' ? (
                        <>
                          <CheckSquare className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          <span>Task: <strong className="font-bold">{act.metadata.title}</strong> (due offset: {act.metadata.dueDateOffsetDays}d)</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span>Email: <strong className="font-bold">{act.metadata.subject}</strong></span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-dark-800/80">
                <button
                  onClick={() => {
                    if (confirm('Delete this workflow automation?')) {
                      deleteWorkflowMutation.mutate(wf._id);
                    }
                  }}
                  className="text-slate-400 hover:text-red-500 text-xs inline-flex items-center space-x-1 font-semibold"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete automation</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Builder Modal Slider drawer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-800 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="pb-4 border-b border-slate-100 dark:border-dark-800 mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Zap className="h-5 w-5 text-primary-500" />
                  <span>Create Automation Workflow</span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-dark-500">Construct trigger-action parameters to automate tasks and alerts.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form id="add-workflow-form" onSubmit={handleSubmitWorkflow} className="space-y-5 text-xs">
                
                {/* Name */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Workflow Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Auto-assign task for high-value deals"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Event trigger */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Event Trigger <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={triggerEvent}
                    onChange={(e: any) => { setTriggerEvent(e.target.value); setConditionField(''); }}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="lead_created">CRM: Lead Created</option>
                    <option value="deal_stage_changed">SALES: Deal Stage Updated</option>
                    <option value="ticket_created">SUPPORT: Ticket Opened</option>
                  </select>
                </div>

                {/* Conditional Rules builders */}
                <div className="bg-slate-50 dark:bg-dark-950/40 p-4 border border-slate-100 dark:border-dark-800/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-dark-800">
                    <span className="font-bold text-slate-800 dark:text-white">Conditions (Optional)</span>
                    <span className="text-[10px] text-slate-400">If empty, trigger fires unconditionally</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Compare Field</label>
                      <select
                        value={conditionField}
                        onChange={(e) => setConditionField(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-950 dark:text-white outline-none cursor-pointer font-semibold"
                      >
                        <option value="">No Filter Rule</option>
                        {triggerEvent === 'deal_stage_changed' && (
                          <>
                            <option value="amount">Opportunity Value (Amount)</option>
                            <option value="status">Deal Status</option>
                          </>
                        )}
                        {triggerEvent === 'lead_created' && (
                          <>
                            <option value="source">Lead Source</option>
                            <option value="priority">Priority</option>
                          </>
                        )}
                        {triggerEvent === 'ticket_created' && (
                          <>
                            <option value="category">Ticket Category</option>
                            <option value="priority">Priority</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Operator</label>
                      <select
                        value={conditionOperator}
                        disabled={!conditionField}
                        onChange={(e: any) => setConditionOperator(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white outline-none cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        <option value="equals">Is Equal To</option>
                        <option value="greater_than">Is Greater Than</option>
                        <option value="less_than">Is Less Than</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Target Value</label>
                      <input
                        disabled={!conditionField}
                        value={conditionValue}
                        onChange={(e) => setConditionValue(e.target.value)}
                        placeholder="E.g. won / 50000"
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-950 dark:text-white outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Automation Actions list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-dark-800">
                    <span className="font-bold text-slate-800 dark:text-white">Automation Actions</span>
                    <button
                      type="button"
                      onClick={handleAddActionRow}
                      className="text-primary-650 hover:text-primary-700 font-bold text-xs"
                    >
                      + Add Action
                    </button>
                  </div>

                  {actions.map((act, idx) => (
                    <div key={idx} className="bg-slate-50/50 dark:bg-dark-950/20 p-3 rounded-2xl border border-slate-100 dark:border-dark-800/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <select
                          value={act.actionType}
                          onChange={(e: any) => handleActionTypeChange(idx, e.target.value)}
                          className="px-2 py-1 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white cursor-pointer font-bold uppercase text-[9px]"
                        >
                          <option value="create_task">Create Follow-up Task</option>
                          <option value="send_email">Send Welcome Email</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveActionRow(idx)}
                          className="text-slate-400 hover:text-red-500 font-bold"
                        >
                          Remove
                        </button>
                      </div>

                      {act.actionType === 'create_task' ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[8px] uppercase tracking-wider mb-1 font-bold text-slate-400">Task Title</label>
                            <input
                              required
                              value={act.metadata.title}
                              onChange={(e) => handleActionMetadataChange(idx, 'title', e.target.value)}
                              placeholder="E.g. Review case filing options"
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider mb-1 font-bold text-slate-400">Due Offset (Days)</label>
                            <input
                              type="number"
                              required
                              min={0}
                              value={act.metadata.dueDateOffsetDays}
                              onChange={(e) => handleActionMetadataChange(idx, 'dueDateOffsetDays', Number(e.target.value))}
                              placeholder="3"
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white text-center"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider mb-1 font-bold text-slate-400">Subject</label>
                            <input
                              required
                              value={act.metadata.subject}
                              onChange={(e) => handleActionMetadataChange(idx, 'subject', e.target.value)}
                              placeholder="E.g. Thank you for contacting support!"
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider mb-1 font-bold text-slate-400">Body</label>
                            <textarea
                              required
                              rows={2}
                              value={act.metadata.body}
                              onChange={(e) => handleActionMetadataChange(idx, 'body', e.target.value)}
                              placeholder="Type email body details..."
                              className="w-full px-2.5 py-1 border border-slate-200 dark:border-dark-800 rounded-lg bg-white dark:bg-dark-900 text-slate-900 dark:text-white resize-none"
                            ></textarea>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </form>
            </div>

            <div className="flex justify-end space-x-3 border-t border-slate-100 dark:border-dark-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-dark-800 text-slate-700 dark:text-dark-300 font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-workflow-form"
                disabled={createWorkflowMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {createWorkflowMutation.isPending ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
