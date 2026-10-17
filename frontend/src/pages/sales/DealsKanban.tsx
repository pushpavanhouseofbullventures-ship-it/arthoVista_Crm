import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Plus, Loader2, AlertCircle, IndianRupee, TrendingUp, 
  Calendar, CheckCircle2, Layers
} from 'lucide-react';

export const DealsKanban: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Pipelines
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await api.get('/deals/pipelines');
      const data = response.data.data;
      if (data.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(data[0]._id);
      }
      return data;
    }
  });

  const activePipeline = pipelines?.find((p: any) => p._id === selectedPipelineId);

  // Fetch Deals
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const response = await api.get('/deals', {
        params: { pipelineId: selectedPipelineId }
      });
      return response.data.data;
    },
    enabled: !!selectedPipelineId
  });

  // Fetch Customers for Deal Creation Selector
  const { data: customersData } = useQuery({
    queryKey: ['selector-customers'],
    queryFn: async () => {
      const response = await api.get('/customers', { params: { limit: 100 } });
      return response.data.data.customers;
    }
  });

  // Change Stage Mutation
  const moveStageMutation = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const response = await api.put(`/deals/${id}/stage`, { stageId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', selectedPipelineId] });
    }
  });

  // Create Deal Mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/deals', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', selectedPipelineId] });
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create deal.');
    }
  });

  // HTML5 Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('dealId');
    if (!id) return;
    moveStageMutation.mutate({ id, stageId: targetStageId });
  };

  const handleCreateDeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      customerId: formData.get('customerId'),
      pipelineId: selectedPipelineId,
      stageId: activePipeline?.stages[0]?._id, // Add to first stage initially
      amount: Number(formData.get('amount')) || 0,
      expectedCloseDate: formData.get('expectedCloseDate') || undefined,
      notes: formData.get('notes') || undefined
    };

    createDealMutation.mutate(payload);
  };

  // Forecast Revenue calculations (Sum of Amount * Probability)
  const calculatePipelineStats = () => {
    if (!deals || deals.length === 0) return { totalAmount: 0, forecastValue: 0 };
    return deals.reduce(
      (acc: any, deal: any) => {
        acc.totalAmount += deal.amount;
        acc.forecastValue += deal.amount * (deal.probability / 100);
        return acc;
      },
      { totalAmount: 0, forecastValue: 0 }
    );
  };

  const stats = calculatePipelineStats();

  if (pipelinesLoading || dealsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Sales Pipelines</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Drag deals through your pipeline stages. Updates win forecasts automatically.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Pipeline switcher */}
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-white dark:bg-dark-900 text-slate-700 dark:text-dark-200 text-xs font-semibold outline-none cursor-pointer"
          >
            {pipelines?.map((p: any) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* Forecast & Pipeline Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Pipeline Value</span>
            <div className="flex items-center text-xl font-bold text-slate-900 dark:text-white">
              <IndianRupee className="h-4.5 w-4.5 text-slate-500 mr-0.5" />
              <span>{stats.totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <Layers className="h-8 w-8 text-primary-500/20" />
        </div>

        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Weighted Forecast</span>
            <div className="flex items-center text-xl font-bold text-green-600 dark:text-green-400">
              <IndianRupee className="h-4.5 w-4.5 mr-0.5" />
              <span>{Math.round(stats.forecastValue).toLocaleString()}</span>
            </div>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500/20" />
        </div>

        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Deals</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {deals?.length || 0} Opportunities
            </div>
          </div>
          <CheckCircle2 className="h-8 w-8 text-sky-500/20" />
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {activePipeline?.stages.map((stage: any) => {
          const stageDeals = deals?.filter((d: any) => d.stageId.toString() === stage._id.toString()) || [];
          const totalStageAmt = stageDeals.reduce((sum: number, d: any) => sum + d.amount, 0);

          return (
            <div
              key={stage._id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage._id)}
              className="flex-shrink-0 w-80 bg-slate-50 dark:bg-dark-950/30 border border-slate-200/80 dark:border-dark-800/80 rounded-3xl p-4 flex flex-col h-[70vh]"
            >
              {/* Stage Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-dark-800/80 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-dark-200 truncate max-w-[150px]">
                    {stage.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">{stage.probability}% Win rate</span>
                </div>
                <span className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-[10px] text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {stageDeals.length}
                </span>
              </div>

              {/* Deals container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageDeals.map((deal: any) => (
                  <div
                    key={deal._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal._id)}
                    className="bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-dark-800/60 hover:border-primary-400 dark:hover:border-primary-600 rounded-2xl p-4 shadow-sm space-y-3 cursor-grab active:cursor-grabbing transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{deal.title}</h4>
                        <span className="text-[9px] text-slate-400 font-mono">{deal.dealId}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5">{deal.customerId?.companyName || deal.customerId?.name}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 dark:border-dark-800/40">
                      <div className="flex items-center font-bold text-slate-800 dark:text-dark-200">
                        <IndianRupee className="h-3 w-3 text-slate-400 mr-0.5" />
                        <span>{deal.amount.toLocaleString()}</span>
                      </div>
                      {deal.expectedCloseDate && (
                        <div className="flex items-center text-slate-450 space-x-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{new Date(deal.expectedCloseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {stageDeals.length === 0 && (
                  <div className="h-24 border border-dashed border-slate-200 dark:border-dark-800/80 rounded-2xl flex items-center justify-center text-[10px] text-slate-400 dark:text-dark-600 italic">
                    Drop deals here
                  </div>
                )}
              </div>

              {/* Column Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-dark-800/80 mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Stage Value</span>
                <div className="flex items-center text-slate-800 dark:text-dark-200">
                  <IndianRupee className="h-3 w-3 mr-0.5" />
                  <span>{totalStageAmt.toLocaleString()}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="pb-3 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Sales Deal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">X</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="add-deal-form" onSubmit={handleCreateDeal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Deal Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="E.g. Statutory audits 2026 retainer"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  name="customerId"
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">Choose client account</option>
                  {customersData?.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.companyName || 'Individual'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Value amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    required
                    placeholder="250000"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Expected Close Date
                  </label>
                  <input
                    name="expectedCloseDate"
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Deal Notes / Scope
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Details regarding quotation requests..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                ></textarea>
              </div>
            </form>

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
                form="add-deal-form"
                disabled={createDealMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {createDealMutation.isPending ? 'Creating...' : 'Save Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
