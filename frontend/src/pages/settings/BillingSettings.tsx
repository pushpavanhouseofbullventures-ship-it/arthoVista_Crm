import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  ShieldCheck, Zap
} from 'lucide-react';

export const BillingSettings: React.FC = () => {
  // Fetch Workspace Usage & Payments
  const { data: billingData } = useQuery({
    queryKey: ['org-billing-subscription'],
    queryFn: async () => {
      const res = await api.get('/billing/subscription');
      return res.data.data;
    }
  });

  const usage = billingData?.usage || { users: 1, leads: 0, campaigns: 0, invoices: 0 };
  const payments = billingData?.payments || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="h-4 w-4" />
            <span>Workspace Account</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Workspace Billing & Access</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
            Internal Office CRM edition with full unrestricted capabilities and unlimited quotas.
          </p>
        </div>
      </div>

      {/* Full Access Status Card */}
      <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-3xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Full Office Access</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Unrestricted
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
                All CRM features, AI briefs, WhatsApp, VoIP dialing, and unlimited invoices are permanently enabled.
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-500/15">
          <div className="p-3 bg-white/80 dark:bg-dark-900/80 rounded-2xl border border-slate-100 dark:border-dark-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Team Members</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{usage.users || 1} Active</span>
          </div>
          <div className="p-3 bg-white/80 dark:bg-dark-900/80 rounded-2xl border border-slate-100 dark:border-dark-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Leads Managed</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{usage.leads || 0}</span>
          </div>
          <div className="p-3 bg-white/80 dark:bg-dark-900/80 rounded-2xl border border-slate-100 dark:border-dark-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Follow-ups</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{usage.followUps || 0}</span>
          </div>
          <div className="p-3 bg-white/80 dark:bg-dark-900/80 rounded-2xl border border-slate-100 dark:border-dark-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoices Created</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{usage.invoices || 0}</span>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      {payments.length > 0 && (
        <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Workspace Payment History</h3>
            <p className="text-xs text-slate-500 dark:text-dark-400">Official billing receipts and transaction records</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Transaction ID</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                {payments.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition">
                    <td className="py-3 pl-2 font-mono text-[11px] text-slate-700 dark:text-dark-200">
                      {p.paymentId || p.orderId}
                    </td>
                    <td className="py-3 font-semibold text-primary-600 dark:text-primary-400">
                      {p.planId?.name || 'Payment'}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      ₹{p.amount}
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
