import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Plus, CheckSquare, Square, Calendar, Loader2, AlertCircle, 
  Trash2, AlertTriangle, ClipboardCheck
} from 'lucide-react';

export const TasksList: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Tasks
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      const response = await api.get('/tasks', {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined
        }
      });
      return response.data.data;
    }
  });

  // Toggle Task Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.put(`/tasks/${id}`, { status });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/tasks', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create task. Try again.';
      setErrorMsg(msg);
    }
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleCreateTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      dueDate: formData.get('dueDate') || undefined,
      priority: formData.get('priority')
    };

    createTaskMutation.mutate(payload);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
      case 'medium': return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400';
      default: return 'text-blue-650 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400';
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Workspace Tasks</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Track operations, workflow checklists, and follow-up activities.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1">
          {['pending', 'in_progress', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === status 
                  ? 'btn-blue-45 text-white shadow' 
                  : 'text-slate-500 hover:bg-slate-100 dark:text-dark-400 dark:hover:bg-dark-800'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Priority select */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 text-xs outline-none cursor-pointer"
        >
          <option value="">Priority: All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* Task List items */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-dark-800/50">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
            <span>Loading task checklist...</span>
          </div>
        ) : isError || !tasksData || tasksData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardCheck className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-700 mb-2" />
            <p className="font-semibold text-slate-500">No tasks in this category</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-light">Create a task to build your workspace checklist.</p>
          </div>
        ) : (
          tasksData.map((task: any) => {
            const isTaskCompleted = task.status === 'completed';
            const overdue = !isTaskCompleted && isOverdue(task.dueDate);
            return (
              <div key={task._id} className="p-5 flex items-start justify-between hover:bg-slate-50/40 dark:hover:bg-dark-900/20 transition duration-150">
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <button 
                    onClick={() => toggleStatusMutation.mutate({ 
                      id: task._id, 
                      status: isTaskCompleted ? 'pending' : 'completed' 
                    })}
                    className="mt-0.5 text-slate-400 hover:text-primary-600 dark:text-dark-500"
                  >
                    {isTaskCompleted ? (
                      <CheckSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <h3 className={`text-sm font-semibold truncate ${
                      isTaskCompleted ? 'text-slate-400 dark:text-dark-600 line-through' : 'text-slate-800 dark:text-white'
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className={`text-xs ${
                        isTaskCompleted ? 'text-slate-350 dark:text-dark-700' : 'text-slate-500 dark:text-dark-400'
                      }`}>
                        {task.description}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2 items-center pt-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${getPriorityColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                      {task.dueDate && (
                        <div className={`flex items-center text-[10px] space-x-1.5 font-semibold ${
                          overdue ? 'text-red-600' : 'text-slate-400 dark:text-dark-500'
                        }`}>
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          {overdue && (
                            <span className="flex items-center text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              Overdue
                            </span>
                          )}
                        </div>
                      )}
                      {task.leadId && (
                        <span className="text-[10px] text-slate-400 font-mono">Lead: {task.leadId.leadId}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete action */}
                <button
                  onClick={() => {
                    if(confirm("Delete this task?")) {
                      deleteTaskMutation.mutate(task._id);
                    }
                  }}
                  className="text-slate-400 hover:text-red-500 dark:text-dark-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-800 transition ml-4"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="pb-3 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">X</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="add-task-form" onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="E.g. Collect business GST certificates"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Detail operations checklist requirements..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-dark-200 outline-none cursor-pointer"
                  />
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
                  </select>
                </div>
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
                form="add-task-form"
                disabled={createTaskMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
