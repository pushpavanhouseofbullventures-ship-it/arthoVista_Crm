import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { 
  Plus, Loader2, AlertCircle, MessageSquare, ChevronRight
} from 'lucide-react';

export const TicketsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { organizations } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('open');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Tickets
  const { data: tickets, isLoading, isError } = useQuery({
    queryKey: ['tickets', statusFilter, priorityFilter, categoryFilter],
    queryFn: async () => {
      const response = await api.get('/tickets', {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          category: categoryFilter || undefined
        }
      });
      return response.data.data;
    }
  });

  // Fetch Customers for Selector (Employee view only)
  const { data: customers } = useQuery({
    queryKey: ['selector-customers'],
    queryFn: async () => {
      const response = await api.get('/customers', { params: { limit: 100 } });
      return response.data.data.customers;
    }
  });

  // Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/tickets', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to file support ticket.');
    }
  });

  // Check if current user is Client (based on role)
  // In DashboardLayout we switched links. Here, we can also check if roles are Client/Viewer
  const isClient = organizations?.[0]?.role === 'Viewer'; // Viewer acts as Client/External read role

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      category: formData.get('category'),
      customerId: isClient ? undefined : formData.get('customerId') // Backend auto-resolves for client
    };

    createTicketMutation.mutate(payload);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
      case 'high': return 'text-orange-700 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400';
      case 'medium': return 'text-blue-755 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400';
      default: return 'text-slate-600 bg-slate-50 dark:bg-dark-800 dark:text-dark-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400';
      case 'in_progress': return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400';
      case 'closed': return 'bg-slate-105 text-slate-700 dark:bg-dark-800 dark:text-dark-400';
      default: return 'bg-orange-50 text-orange-705 dark:bg-orange-950/20 dark:text-orange-400'; // open
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Support Helpdesk</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">File service issues, billing inquiries, and trace technical resolution logs.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>File Ticket</span>
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'open', name: 'Open Queries' },
            { id: 'in_progress', name: 'In Progress' },
            { id: 'resolved', name: 'Resolved' },
            { id: 'closed', name: 'Closed' }
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === pill.id 
                  ? 'btn-blue-45 text-white shadow' 
                  : 'text-slate-500 hover:bg-slate-100 dark:text-dark-400 dark:hover:bg-dark-800'
              }`}
            >
              {pill.name}
            </button>
          ))}
        </div>

        {/* Filters dropdown */}
        <div className="flex space-x-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 text-xs outline-none cursor-pointer"
          >
            <option value="">Priority: All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 text-xs outline-none cursor-pointer"
          >
            <option value="">Category: All</option>
            <option value="billing">Billing</option>
            <option value="service">Service</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-950 text-slate-400 dark:text-dark-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-dark-800/80">
                <th className="py-4 px-6">Ticket ID</th>
                <th className="py-4 px-4">Subject</th>
                <th className="py-4 px-4">Client / Account</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Priority</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Last activity</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : isError || !tickets || tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <MessageSquare className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-700 mb-2" />
                    <p className="font-semibold text-slate-500 dark:text-dark-400">No tickets found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-light">Submit a ticket to launch support workflows.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t: any) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-650 dark:text-dark-400">
                      {t.ticketId}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{t.title}</div>
                      <div className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5 flex items-center space-x-1">
                        <span>Replies: {t.messages.length - 1}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{t.customerId?.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5">{t.customerId?.companyName || 'Individual'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300 px-2 py-0.5 rounded font-mono uppercase font-bold text-[9px]">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-[10px]">
                      {new Date(t.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link 
                        to={`/crm/tickets/${t._id}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold inline-flex items-center"
                      >
                        <span>View Thread</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Support Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-fade-in" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 animate-scale-up">
            <div className="pb-3 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">File Support Ticket</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">X</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="add-ticket-form" onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Ticket Subject <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="E.g. Bank statement upload error on Case SC-1002"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {!isClient && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Select Customer Account <span className="text-red-500">*</span>
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
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="technical">Technical Issue</option>
                    <option value="service">Service Delay</option>
                    <option value="billing">Invoicing / Billing</option>
                    <option value="other">Other Query</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Query Description / Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Detail your request or support query..."
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
                form="add-ticket-form"
                disabled={createTicketMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {createTicketMutation.isPending ? 'Filing...' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
