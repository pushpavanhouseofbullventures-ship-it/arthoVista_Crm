import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { 
  ArrowLeft, Loader2, AlertCircle, Send
} from 'lucide-react';

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { organizations } = useAuthStore();
  const [replyContent, setReplyContent] = useState('');

  // Fetch Ticket Details
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await api.get(`/tickets/${id}`);
      return response.data.data;
    }
  });

  // Fetch Employees for assignment selector
  const { data: employees } = useQuery({
    queryKey: ['selector-employees'],
    queryFn: async () => {
      // Mocking some internal support engineers in dev
      return [
        { id: 'dev-rep-1', name: 'Rahul Sharma' },
        { id: 'dev-rep-2', name: 'Priya Patel' },
        { id: 'dev-rep-3', name: 'Amit Singh' }
      ];
    }
  });

  // Update Status/Assignee Mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put(`/tickets/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    }
  });

  // Post Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/tickets/${id}/messages`, { content });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyContent('');
    }
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    replyMutation.mutate(replyContent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="p-6 text-center bg-white dark:bg-dark-900 border rounded-2xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800 dark:text-white">Ticket not found</h3>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">Make sure you have appropriate support permissions.</p>
        <Link to="/crm/tickets" className="inline-block mt-4 text-xs font-semibold text-primary-600">Back to Helpdesk</Link>
      </div>
    );
  }

  // Check if role is Client/Viewer
  const isClient = organizations?.[0]?.role === 'Viewer';

  return (
    <div className="space-y-6">
      {/* Navigation bar */}
      <div className="flex justify-between items-center">
        <Link 
          to="/crm/tickets" 
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-dark-400 dark:hover:text-dark-200 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>Back to Helpdesk</span>
        </Link>
        <span className="text-xs text-slate-400 dark:text-dark-500 font-mono">Ticket ID: {ticket.ticketId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Ticket Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            <div>
              <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300 px-2 py-0.5 rounded font-mono font-bold">
                {ticket.category} category
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-2">{ticket.title}</h2>
            </div>

            {/* Change Status */}
            <div className="space-y-1.5 text-xs">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Query Status</label>
              {isClient ? (
                <div className="flex items-center justify-between">
                  <span className="capitalize font-bold text-slate-800 dark:text-dark-250 bg-slate-50 dark:bg-dark-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-dark-800 w-full">
                    {ticket.status.replace('_', ' ')}
                  </span>
                  {ticket.status !== 'closed' && (
                    <button
                      onClick={() => updateTicketMutation.mutate({ status: 'closed' })}
                      className="ml-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[10px]"
                    >
                      Close
                    </button>
                  )}
                </div>
              ) : (
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketMutation.mutate({ status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-750 dark:text-dark-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="open">OPEN (Needs Reply)</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                  <option value="closed">CLOSED</option>
                </select>
              )}
            </div>

            {/* Change Support Assignee */}
            {!isClient && (
              <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-dark-800/80 pt-4">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Assigned Engineer</label>
                <select
                  value={ticket.assignedTo?._id || ''}
                  onChange={(e) => updateTicketMutation.mutate({ assignedTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-750 dark:text-dark-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {employees?.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Client summary */}
            <div className="border-t border-slate-100 dark:border-dark-800/80 pt-4 space-y-2 text-xs">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Customer Profile</span>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">{ticket.customerId?.name}</h4>
                <p className="text-slate-450 mt-0.5">{ticket.customerId?.companyName || 'Individual Client'}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">{ticket.customerId?.email}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Chat Board Thread */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col h-[75vh]">
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
            {ticket.messages.map((msg: any, index: number) => {
              const isAgent = msg.senderType === 'user';
              return (
                <div 
                  key={msg._id || index}
                  className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-md rounded-2xl p-4 shadow-2xs space-y-1 ${
                    isAgent 
                      ? 'bg-slate-50 border border-slate-150 text-slate-800 dark:bg-dark-950/40 dark:border-dark-800 dark:text-dark-200' 
                      : 'btn-blue-45 text-white'
                  }`}>
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider space-x-6 opacity-75">
                      <span>{msg.senderName}</span>
                      <span className="font-mono">{new Date(msg.date).toLocaleDateString()} {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs leading-relaxed font-light whitespace-pre-line">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Composition bar */}
          {ticket.status !== 'closed' ? (
            <form onSubmit={handleSendReply} className="border-t border-slate-100 dark:border-dark-800/80 pt-4 flex items-center space-x-2">
              <input
                placeholder="Type reply or technical feedback notes..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={replyMutation.isPending || !replyContent.trim()}
                className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reply</span>
              </button>
            </form>
          ) : (
            <div className="border-t border-slate-100 dark:border-dark-800/80 pt-4 text-center text-xs text-slate-400 italic font-semibold">
              This support ticket has been closed. Re-open to register new replies.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
