import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  ArrowLeft, Loader2, AlertCircle, User, 
  FileText, CheckCircle, XCircle, Download, Upload, 
  FileCheck2
} from 'lucide-react';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch Case details
  const { data: serviceCase, isLoading, isError } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const response = await api.get(`/cases/${id}`);
      return response.data.data;
    }
  });

  // Update Stage Mutation
  const updateStageMutation = useMutation({
    mutationFn: async (stage: string) => {
      const response = await api.put(`/cases/${id}/stage`, { stage });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    }
  });

  // Update Checklist Item Mutation (Approve/Reject)
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ itemId, status, reviewerNotes }: { itemId: string; status: string; reviewerNotes?: string }) => {
      const response = await api.put(`/cases/${id}/checklist/${itemId}`, { status, reviewerNotes });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setShowRejectModal(false);
      setRejectNotes('');
      setSelectedItemId(null);
    }
  });

  // File Upload Mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/documents/cases/${id}/upload/${itemId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFileMutation.mutate({ itemId, file: files[0] });
  };

  // Secure downloader passing token and tenant headers
  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: (response.headers['content-type'] as string) || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download file. Verify you belong to this organization.');
    }
  };

  const triggerRejectFlow = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowRejectModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (isError || !serviceCase) {
    return (
      <div className="p-6 text-center bg-white dark:bg-dark-900 border rounded-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800 dark:text-white">Service Case not found</h3>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">Make sure you are logged in and have access permissions.</p>
        <Link to="/crm/cases" className="inline-block mt-4 text-xs font-semibold text-primary-600">Back to Cases</Link>
      </div>
    );
  }

  const stagesList = ['created', 'docs_requested', 'docs_received', 'verification', 'processing', 'completed', 'closed', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* Top Navigation bar */}
      <div className="flex justify-between items-center">
        <Link 
          to="/crm/cases" 
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-dark-400 dark:hover:text-dark-200 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Back to Cases</span>
        </Link>
        <span className="text-xs text-slate-400 dark:text-dark-500 font-mono">Case ID: {serviceCase.caseId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Client & Case Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            <div>
              <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono font-bold">
                {serviceCase.serviceId.replace('_', ' ')}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">{serviceCase.serviceName}</h2>
            </div>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Workflow Stage</label>
              <select
                value={serviceCase.stage}
                onChange={(e) => updateStageMutation.mutate(e.target.value)}
                disabled={updateStageMutation.isPending}
                className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 text-xs font-semibold outline-none cursor-pointer"
              >
                {stagesList.map(st => (
                  <option key={st} value={st}>{st.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Customer info card */}
            <div className="border-t border-slate-100 dark:border-dark-800/80 pt-4 space-y-3">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Client Profile</span>
              <div className="text-xs">
                <h4 className="font-bold text-slate-800 dark:text-white">{serviceCase.customerId?.name}</h4>
                <p className="text-slate-450 mt-0.5">{serviceCase.customerId?.companyName || 'Individual'}</p>
                
                {serviceCase.customerId?.billingAddress && (
                  <p className="text-[10px] text-slate-400 mt-2 italic leading-relaxed">
                    Address: {serviceCase.customerId.billingAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Rep assigned */}
            <div className="border-t border-slate-100 dark:border-dark-800/80 pt-4 text-xs flex justify-between items-center text-slate-500">
              <div className="flex items-center space-x-1.5">
                <User className="h-4 w-4 text-slate-400" />
                <span>Assigned Manager:</span>
              </div>
              <span className="font-bold text-slate-800 dark:text-dark-200">
                {serviceCase.assignedTo ? `${serviceCase.assignedTo.firstName} ${serviceCase.assignedTo.lastName}` : 'Unassigned'}
              </span>
            </div>

          </div>
        </div>

        {/* Right Column: Required Documents Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Required Document Checklist</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload required files. Employees can approve or reject copies.</p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-dark-800/50">
              {serviceCase.checklist.map((item: any) => {
                const doc = item.documentId;
                const isPending = item.status === 'pending';
                const isSubmitted = item.status === 'submitted';
                const isApproved = item.status === 'approved';
                const isRejected = item.status === 'rejected';

                return (
                  <div key={item._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    
                    {/* Item label */}
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 dark:text-white">{item.name}</h4>
                        {item.isRequired && (
                          <span className="text-[8px] bg-red-50 text-red-700 px-1 rounded uppercase font-extrabold">Required</span>
                        )}
                      </div>
                      {isRejected && item.reviewerNotes && (
                        <p className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded italic">
                          Reason: {item.reviewerNotes}
                        </p>
                      )}
                    </div>

                    {/* File / Upload Area */}
                    <div className="flex items-center space-x-3.5">
                      {isPending ? (
                        <label className="bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-dark-950 dark:border-dark-800 text-slate-700 dark:text-dark-300 font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs transition">
                          <Upload className="h-3.5 w-3.5 text-slate-500" />
                          <span>Choose & Upload</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, item._id)}
                          />
                        </label>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* File details card */}
                          <div className="p-2 border border-slate-150 dark:border-dark-800 rounded-lg flex items-center space-x-2 max-w-xs bg-slate-50/50 dark:bg-dark-950/20">
                            <FileText className="h-4.5 w-4.5 text-primary-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-dark-250 truncate text-[10px]">{doc?.fileName || 'Document File'}</p>
                              <span className="text-[8px] text-slate-400 uppercase font-mono">{(doc?.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <button
                              onClick={() => handleDownload(doc._id, doc.fileName)}
                              className="text-slate-400 hover:text-primary-500 p-1 transition"
                              title="Download document copy"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Approval tags / actions */}
                          <div className="flex space-x-1.5">
                            {isSubmitted && (
                              <>
                                <button
                                  onClick={() => updateChecklistMutation.mutate({ itemId: item._id, status: 'approved' })}
                                  className="bg-green-500 hover:bg-green-600 text-white font-bold p-1 rounded transition"
                                  title="Approve document"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => triggerRejectFlow(item._id)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold p-1 rounded transition"
                                  title="Reject document copy"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <span className="text-[9px] bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                                <FileCheck2 className="h-3 w-3" />
                                <span>Approved</span>
                              </span>
                            )}

                            {isRejected && (
                              <span className="text-[9px] bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 font-bold px-2 py-0.5 rounded-full uppercase flex items-center space-x-1">
                                <XCircle className="h-3 w-3" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Reject Modal with notes input */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowRejectModal(false)}></div>
          <div className="relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reject Document Copy</h3>
            
            <div className="space-y-3">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Reason for Rejection</label>
              <textarea
                rows={2}
                placeholder="E.g. Document image is blurry / Outdated bank statement copy"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-xs text-slate-950 dark:text-white outline-none resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-dark-800">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-dark-800 text-slate-700 dark:text-dark-300 text-[11px] font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedItemId) {
                    updateChecklistMutation.mutate({ 
                      itemId: selectedItemId, 
                      status: 'rejected', 
                      reviewerNotes: rejectNotes 
                    });
                  }
                }}
                className="bg-red-650 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-[11px]"
              >
                Reject Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
