import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  UserCheck, RefreshCw, CheckCircle2,
  Sliders, History, UserPlus, Users, X,
  Trash2, AlertTriangle
} from 'lucide-react';

export const AdminAssignment: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, organizations, activeOrganizationId } = useAuthStore();
  const activeOrg = organizations.find(org => org.id === activeOrganizationId) || organizations[0];
  const currentRole = activeOrg?.role || (['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '') ? 'Admin' : 'Sale Executive');

  // 4-Tier Hierarchy: 1. Admin, 2. Manager, 3. Team Leader, 4. Sale Executive
  const isAdmin = ['Super Admin', 'Admin'].includes(currentRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(user?.email || '');
  const isSuperAdmin = isAdmin;

  const [activeTab, setActiveTab] = useState<'employees' | 'unassigned' | 'rules' | 'audit'>('employees');

  // Register Employee Modal State (Core hierarchy: Admin, Manager, Sale Executive)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'Finance' | 'Operation' | 'Sale Executive' | 'HR'>('Sale Executive');

  // Delete Employee State
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // 1. Fetch Config and Workload
  const { data: configData } = useQuery({
    queryKey: ['assignment-config'],
    queryFn: async () => {
      const res = await api.get('/assignment/config');
      return res.data.data;
    }
  });

  // 2. Fetch Detailed Employees List
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['team-employees-list'],
    queryFn: async () => {
      const res = await api.get('/assignment/employees');
      return res.data.data || [];
    }
  });

  // 3. Fetch Unassigned Leads
  const { data: unassignedData, isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ['unassigned-leads'],
    queryFn: async () => {
      const res = await api.get('/leads', { params: { unassignedOnly: 'true', limit: 50 } });
      return res.data.data;
    }
  });

  // 4. Fetch Assignment Audit Logs
  const { data: auditLogsData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['assignment-logs'],
    queryFn: async () => {
      const res = await api.get('/leads/assignment-logs', { params: { limit: 50 } });
      return res.data.data;
    }
  });

  // Register Employee Mutation (Admin / Manager only)
  const registerEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/assignment/employees', payload);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Team member registered successfully.');
      queryClient.invalidateQueries({ queryKey: ['team-employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
      queryClient.invalidateQueries({ queryKey: ['employees-master-list'] });
      setShowRegisterModal(false);
      resetRegisterForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to register team member.');
    }
  });

  // Toggle Employee Status Mutation (Admin only)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      const res = await api.patch(`/assignment/employees/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to toggle employee status.');
    }
  });

  // Delete Employee Mutation (Admin only)
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/assignment/employees/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Team member deleted and leads moved to Unassigned Queue.');
      queryClient.invalidateQueries({ queryKey: ['team-employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete team member.');
    }
  });

  // Auto-Assign Mutation (Admin only)
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/assignment/auto-assign', { rule: 'round_robin', limit: 50 });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Leads auto-assigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to execute auto-assignment.');
    }
  });

  const resetRegisterForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('Sale Executive');
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'Admin':
      case 'Super Admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
            1. Admin
          </span>
        );
      case 'Manager':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
            2. Manager
          </span>
        );
      case 'Team Leader':
      case 'TL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            3. TL
          </span>
        );
      case 'Finance':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            4. Finance
          </span>
        );
      case 'Operation':
      case 'Operations':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
            5. Operation
          </span>
        );
      case 'Sale Executive':
      case 'Sales Executive':
      case 'Employee':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700">
            Sale Executive
          </span>
        );
    }
  };


  // Manual Assign Single Lead Mutation
  const assignSingleLeadMutation = useMutation({
    mutationFn: async ({ leadId, repId }: { leadId: string; repId: string }) => {
      const res = await api.post('/leads/assign', {
        leadIds: [leadId],
        assignedTo: repId,
        reason: 'Manual Admin Assignment'
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-config'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-leads'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-logs'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Subtle Ambient 45-deg orbs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#fe7c02]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 -mb-16 w-64 h-64 bg-[#028825]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-3.5 z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] p-0.5 shadow-sm flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-white dark:bg-dark-900 rounded-[14px] flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                Team & Lead Assignment Console
              </h1>
              <span className="text-[10px] font-black bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 px-1.5 py-0.5 rounded border border-orange-300">
                TEAM
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">
              {isSuperAdmin
                ? 'Register employees, manage roles, configure auto-assignment distribution, and triage unassigned leads.'
                : 'Monitor team workload, active allocations, distribution rules, and historical audit logs (Manager View).'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 z-10">
          {isSuperAdmin ? (
            <>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-tri-45 font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Register Employee</span>
              </button>

              <button
                onClick={() => autoAssignMutation.mutate()}
                disabled={autoAssignMutation.isPending || (configData?.unassignedCount || 0) === 0}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
              >
                {autoAssignMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                <span>Auto-Assign ({configData?.unassignedCount || 0})</span>
              </button>
            </>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold text-xs border border-blue-200/50 dark:border-blue-800/40">
              Manager View-Only Mode
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-dark-800 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'employees'
              ? 'btn-blue-45 text-white shadow-sm'
              : 'text-slate-600 dark:text-dark-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Team & Employees</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
            {(employeesData || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'unassigned'
              ? 'btn-blue-45 text-white shadow-sm'
              : 'text-slate-600 dark:text-dark-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <span>Unassigned Leads</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
            {configData?.unassignedCount || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'rules'
              ? 'btn-blue-45 text-white shadow-sm'
              : 'text-slate-600 dark:text-dark-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Workload & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${activeTab === 'audit'
              ? 'btn-blue-45 text-white shadow-sm'
              : 'text-slate-600 dark:text-dark-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Assignment Audit</span>
        </button>
      </div>

      {/* TAB 0: TEAM & EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-dark-800 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Registered Team Members & Sales Agents</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin
                    ? 'Manage employee accounts, role assignments, status, and active system access.'
                    : 'View team directory, active roles, and sales workload metrics.'}
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl btn-tri-45 font-bold text-xs transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Register New Employee</span>
                </button>
              )}
            </div>

            {isLoadingEmployees ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading team members...</div>
            ) : !employeesData || employeesData.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="h-8 w-8 text-slate-300 dark:text-dark-600 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">No Employees Registered</p>
                <p className="text-xs text-slate-400">
                  {isSuperAdmin ? 'Click "Register New Employee" to add team members.' : 'No team members found.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-dark-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600 dark:text-dark-300">
                  <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Team Member</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Active Leads</th>
                      <th className="p-3 text-center">Won Leads</th>
                      <th className="p-3 text-center">Conversion</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                    {employeesData.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition">
                        <td className="p-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {emp.firstName.charAt(0)}{emp.lastName?.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-white">
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-dark-400 font-mono text-[11px]">{emp.email}</td>
                        <td className="p-3">
                          {getRoleBadge(emp.role)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            }`}>
                            {emp.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">{emp.workload?.openLeads || 0}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{emp.workload?.convertedLeads || 0}</td>
                        <td className="p-3 text-center font-semibold">{emp.workload?.conversionRate || 0}%</td>
                        <td className="p-3 text-right">
                          {isSuperAdmin ? (
                            (() => {
                              const isAdmin =
                                emp.role === 'Admin' ||
                                emp.role === 'Super Admin' ||
                                ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(emp.email);

                              if (isAdmin) {
                                return (
                                  <span className="text-[10px] font-semibold text-slate-400 dark:text-dark-500 italic pr-2">
                                    Protected (Admin)
                                  </span>
                                );
                              }

                              return (
                                <div className="inline-flex items-center space-x-1.5">
                                  <button
                                    onClick={() => toggleStatusMutation.mutate({
                                      id: emp.id,
                                      status: emp.status === 'active' ? 'inactive' : 'active'
                                    })}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${emp.status === 'active'
                                        ? 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 dark:bg-dark-800 dark:hover:bg-amber-950/30 dark:text-dark-400 dark:hover:text-amber-400'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      }`}
                                  >
                                    {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>

                                  {emp.id !== user?.id && !['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(emp.email) && (
                                    <button
                                      onClick={() => setDeleteTarget(emp)}
                                      title="Delete employee and unassign leads"
                                      className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 dark:text-rose-400 transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-dark-500 font-medium italic">
                              View Only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: UNASSIGNED LEADS QUEUE */}
      {activeTab === 'unassigned' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white">Unassigned Leads Waiting for Allocation</h2>
              <p className="text-xs text-slate-400">Leads with no assigned sales representative remain invisible to standard employees until assigned.</p>
            </div>
          </div>

          {isLoadingUnassigned ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading unassigned queue...</div>
          ) : !unassignedData?.leads || unassignedData.leads.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-white">All Caught Up!</p>
              <p className="text-xs text-slate-400">There are no unassigned leads in the queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-dark-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600 dark:text-dark-300">
                <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Lead ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Assign Lead To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                  {unassignedData.leads.map((lead: any) => (
                    <tr key={lead._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30">
                      <td className="p-3 font-mono font-bold text-primary-600">{lead.leadId}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white">{lead.name}</td>
                      <td className="p-3">{lead.company || '—'}</td>
                      <td className="p-3 font-semibold">{lead.phone}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800 text-[10px] font-bold">
                          {lead.source}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 text-right">
                        {isSuperAdmin ? (
                          <div className="inline-flex items-center space-x-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignSingleLeadMutation.mutate({ leadId: lead._id, repId: e.target.value });
                                }
                              }}
                              defaultValue=""
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-xs font-semibold outline-none"
                            >
                              <option value="" disabled>Select Employee...</option>
                              {(configData?.reps || []).map((r: any) => (
                                <option key={r.user._id} value={r.user._id}>
                                  {r.user.firstName} {r.user.lastName} ({r.workload.openLeads} active)
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned (Admin only)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEAM WORKLOAD & AUTO-ASSIGNMENT RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Workload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(configData?.reps || []).map((r: any) => (
              <div key={r.user._id} className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                      {r.user.firstName.charAt(0)}{r.user.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{r.user.firstName} {r.user.lastName}</p>
                      <p className="text-[11px] text-slate-400">{r.role}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-black text-[10px]">
                    {r.workload.conversionRate}% Converted
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100 dark:border-dark-800">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-800/50">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                    <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{r.workload.totalAssigned}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">Open</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{r.workload.openLeads}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Won</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{r.workload.convertedLeads}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rules Configuration */}
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-primary-500" />
              <span>Automated Lead Distribution Rules</span>
            </h2>

            <div className="space-y-3">
              {(configData?.rules || []).map((rule: any) => (
                <div key={rule.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/40 border border-slate-200 dark:border-dark-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                      <span>{rule.name}</span>
                      {rule.enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold text-[9px]">Active</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{rule.description}</p>
                  </div>
                  <label className={`relative inline-flex items-center ${isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      defaultChecked={rule.enabled}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENT AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Assignment & Reassignment Audit Log</h2>
            <p className="text-xs text-slate-400">Complete historical audit trail of all lead allocations.</p>
          </div>

          {isLoadingAudit ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : !auditLogsData?.logs || auditLogsData.logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No assignment logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-dark-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600 dark:text-dark-300">
                <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-white font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Lead</th>
                    <th className="p-3">Assigned By</th>
                    <th className="p-3">From</th>
                    <th className="p-3">To</th>
                    <th className="p-3">Rule / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                  {auditLogsData.logs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30">
                      <td className="p-3 text-slate-400">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white">
                        {log.leadId ? `${log.leadId.name} (#${log.leadId.leadId})` : '—'}
                      </td>
                      <td className="p-3">{log.assignedBy ? `${log.assignedBy.firstName} ${log.assignedBy.lastName}` : 'System Rule'}</td>
                      <td className="p-3 text-slate-400">{log.fromUserId ? `${log.fromUserId.firstName} ${log.fromUserId.lastName}` : 'Unassigned'}</td>
                      <td className="p-3 font-bold text-primary-600">{log.toUserId ? `${log.toUserId.firstName} ${log.toUserId.lastName}` : '—'}</td>
                      <td className="p-3 font-medium text-slate-600 dark:text-dark-300">{log.reason || log.ruleApplied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REGISTER EMPLOYEE MODAL (Admin only) */}
      {showRegisterModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Register New Team Member</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                registerEmployeeMutation.mutate({
                  firstName: newFirstName,
                  lastName: newLastName,
                  email: newEmail,
                  password: newPassword,
                  role: newRole
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-white mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verma"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="employee@arthovista.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Initial Password * (min 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-white mb-1">Hierarchy Level / Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-white outline-none font-semibold cursor-pointer"
                >
                  <option value="Admin">1. Admin (Full system & organization control)</option>
                  <option value="Manager">2. Manager (Team management, unassigned queues, reports)</option>
                  <option value="Sale Executive">Sale Executive (Direct client outreach, follow-ups, quotes)</option>
                  <option value="HR">HR / HR Calling (Candidate recruitment & telecalling)</option>
                  <option value="Finance">Finance (Billing review, tax invoices & payments in OT Pipeline)</option>
                  <option value="Operation">Operation (KYC, service execution & delivery milestones in OT Pipeline)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-dark-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerEmployeeMutation.isPending}
                  className="px-5 py-2 rounded-xl btn-tri-45 text-white font-bold transition shadow-md disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
                >
                  {registerEmployeeMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{registerEmployeeMutation.isPending ? 'Registering...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE EMPLOYEE CONFIRMATION MODAL (Admin only) */}
      {deleteTarget && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Delete Employee Account</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-dark-300">
              <p>
                Are you sure you want to permanently delete team member <strong className="text-slate-900 dark:text-white">{deleteTarget.firstName} {deleteTarget.lastName}</strong> (<span className="font-mono">{deleteTarget.email}</span>)?
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 space-y-1.5">
                <p className="font-bold flex items-center space-x-1.5">
                  <span>🛡️ Lead Protection Guarantee</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  All <strong className="font-black">{deleteTarget.workload?.openLeads || 0} active leads</strong> assigned to this employee will <strong>NOT</strong> be deleted. They will remain completely safe and be automatically transferred to the <strong>Unassigned Leads Queue</strong> for future allocation.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-dark-300 font-bold hover:bg-slate-100 dark:hover:bg-dark-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteEmployeeMutation.isPending}
                onClick={() => deleteEmployeeMutation.mutate(deleteTarget.id)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-md disabled:opacity-50 flex items-center space-x-1.5"
              >
                {deleteEmployeeMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete & Unassign Leads'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
