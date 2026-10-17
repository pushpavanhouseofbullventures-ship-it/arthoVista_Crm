import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Building2, Search } from 'lucide-react';

export const AdminOrganizations: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch all organizations with user counts & subscriptions
  const { data: organizations } = useQuery({
    queryKey: ['admin-organizations-page'],
    queryFn: async () => {
      const res = await api.get('/admin/organizations');
      return res.data.data;
    }
  });

  // Toggle Suspension Mutation
  const toggleSuspensionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.patch(`/admin/organizations/${id}/toggle-suspension`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations-page'] });
    }
  });

  const filteredOrgs = (organizations || []).filter((org: any) => {
    return org.name.toLowerCase().includes(search.toLowerCase()) || 
           (org.email && org.email.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Building2 className="h-4 w-4" />
          <span>Tenant Governance</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Tenant Organizations</h1>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
          Directory of all registered workspaces, team sizes, active plans, and administrative suspension controls.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-dark-900 p-4 rounded-2xl border border-slate-200 dark:border-dark-800">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs outline-none"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-6">Workspace Name</th>
                <th className="py-3.5">Contact Email</th>
                <th className="py-3.5">Team Size</th>
                <th className="py-3.5">Active Plan</th>
                <th className="py-3.5">Registered On</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org: any) => (
                  <tr key={org._id} className="hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition">
                    <td className="py-4 pl-6">
                      <span className="font-bold text-slate-900 dark:text-white block">{org.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{org.businessType || 'General'} Workspace</span>
                    </td>

                    <td className="py-4 text-slate-600 dark:text-dark-300">
                      {org.email || 'No email provided'}
                    </td>

                    <td className="py-4 font-bold text-slate-800 dark:text-white">
                      {org.userCount || 1} Members
                    </td>

                    <td className="py-4 font-bold text-primary-600 dark:text-primary-400">
                      {org.subscription?.planName || 'Starter'}
                    </td>

                    <td className="py-4 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        org.isSuspended 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {org.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>

                    <td className="py-4 pr-6 text-right">
                      <button
                        onClick={() => toggleSuspensionMutation.mutate({ 
                          id: org._id, 
                          reason: org.isSuspended ? 'Reactivated by admin' : 'Suspended by admin' 
                        })}
                        disabled={toggleSuspensionMutation.isPending}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition ${
                          org.isSuspended
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {org.isSuspended ? 'Reactivate' : 'Suspend Tenant'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
