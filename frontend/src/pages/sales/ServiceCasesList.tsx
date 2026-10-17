import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  Plus, Loader2, AlertCircle, Briefcase, ChevronRight
} from 'lucide-react';

export const ServiceCasesList: React.FC = () => {
  const queryClient = useQueryClient();
  const [stageFilter, setStageFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Cases
  const { data: casesData, isLoading, isError } = useQuery({
    queryKey: ['cases', stageFilter],
    queryFn: async () => {
      const response = await api.get('/cases', {
        params: { stage: stageFilter || undefined }
      });
      return response.data.data;
    }
  });

  // Fetch Customers for Selector
  const { data: customers } = useQuery({
    queryKey: ['selector-customers'],
    queryFn: async () => {
      const response = await api.get('/customers', { params: { limit: 100 } });
      return response.data.data.customers;
    }
  });

  // Create Case Mutation
  const createCaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/cases', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create case.');
    }
  });

  const handleCreateCase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const serviceId = formData.get('serviceId') as string;

    const serviceNamesMap: Record<string, string> = {
      business_loan: 'Business Loan Consultancy',
      gst_registration: 'GST Registration Filing',
      company_registration: 'Company Private Limited Setup',
      trademark: 'Trademark Registration & Search',
      msme_udyam: 'MSME / Udyam Certification filing',
      business_certification: 'ISO / Startup Certification support'
    };

    const payload = {
      customerId: formData.get('customerId'),
      serviceId,
      serviceName: serviceNamesMap[serviceId] || 'Consultancy Support'
    };

    createCaseMutation.mutate(payload);
  };

  const getChecklistSummary = (checklist: any[]) => {
    if (!checklist || checklist.length === 0) return { total: 0, submitted: 0, percent: 0 };
    const total = checklist.length;
    // Submitted, Approved or Rejected counts as uploaded
    const submitted = checklist.filter(c => c.status !== 'pending').length;
    return {
      total,
      submitted,
      percent: Math.round((submitted / total) * 100)
    };
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'completed':
      case 'closed':
        return 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400';
      case 'processing':
      case 'verification':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400';
      case 'docs_received':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400';
      case 'cancelled':
        return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-dark-800 dark:text-dark-400';
    }
  };

  const stagesList = ['created', 'docs_requested', 'docs_received', 'verification', 'processing', 'completed', 'closed', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Service Cases</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Track operations, file uploads, government processing, and statutory compliance status.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Launch Service Case</span>
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Stage Filters */}
        <div className="flex flex-wrap gap-1 border-b border-slate-100 dark:border-dark-800/60 pb-3">
          <button
            onClick={() => setStageFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              !stageFilter 
                ? 'btn-blue-45 text-white shadow' 
                : 'text-slate-500 hover:bg-slate-100 dark:text-dark-400 dark:hover:bg-dark-800'
            }`}
          >
            All Cases
          </button>
          {stagesList.map(st => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                stageFilter === st 
                  ? 'btn-blue-45 text-white shadow' 
                  : 'text-slate-500 hover:bg-slate-100 dark:text-dark-400 dark:hover:bg-dark-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-950 text-slate-400 dark:text-dark-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-dark-800/80">
                <th className="py-4 px-6">Case ID</th>
                <th className="py-4 px-4">Service Details</th>
                <th className="py-4 px-4">Customer Name</th>
                <th className="py-4 px-4">Required Documents Checklist</th>
                <th className="py-4 px-4">Workflow Stage</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" />
                    <span>Loading service cases...</span>
                  </td>
                </tr>
              ) : isError || !casesData || casesData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-dark-700" />
                    <p className="font-semibold text-slate-500 dark:text-dark-400">No active cases</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Start a new service case to coordinate uploads and verification checklists.</p>
                  </td>
                </tr>
              ) : (
                casesData.map((cs: any) => {
                  const chk = getChecklistSummary(cs.checklist);
                  return (
                    <tr key={cs._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/30 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-650 dark:text-dark-400">
                        {cs.caseId}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{cs.serviceName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5 font-mono uppercase">{cs.serviceId.replace('_', ' ')}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{cs.customerId?.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5">{cs.customerId?.companyName || 'Individual'}</div>
                      </td>
                      <td className="py-4 px-4 w-60">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                            <span>{chk.submitted} of {chk.total} uploaded</span>
                            <span>{chk.percent}%</span>
                          </div>
                          {/* Progress bar container */}
                          <div className="w-full bg-slate-100 dark:bg-dark-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="brand-tri-45 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${chk.percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStageBadgeColor(cs.stage)}`}>
                          {cs.stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link 
                          to={`/crm/cases/${cs._id}`}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold inline-flex items-center"
                        >
                          <span>Manage Case</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Case Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="pb-3 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Launch Service Case</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">X</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="add-case-form" onSubmit={handleCreateCase} className="space-y-4 text-xs">
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
                  {customers?.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.companyName || 'Individual'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="serviceId"
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                >
                  <option value="business_loan">Business Loan Consultancy</option>
                  <option value="gst_registration">GST Registration Filing</option>
                  <option value="company_registration">Company Private Limited Setup</option>
                  <option value="trademark">Trademark Registration & Search</option>
                  <option value="msme_udyam">MSME / Udyam Certification</option>
                  <option value="business_certification">ISO Certification support</option>
                </select>
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
                form="add-case-form"
                disabled={createCaseMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {createCaseMutation.isPending ? 'Launching...' : 'Create Case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
