import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CreditCard, CheckCircle2 } from 'lucide-react';

export const AdminPayments: React.FC = () => {
  const { data: payments } = useQuery({
    queryKey: ['admin-payments-page'],
    queryFn: async () => {
      const res = await api.get('/admin/payments');
      return res.data.data;
    }
  });

  const totalCollected = (payments || []).reduce((acc: number, p: any) => {
    return p.status === 'captured' ? acc + p.amount : acc;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CreditCard className="h-4 w-4" />
            <span>Revenue & Financials</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Payment Transactions</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
            Audit trail of all online Razorpay checkouts and manual bank transfers across all tenants.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center space-x-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Total Processed</span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">₹{totalCollected.toLocaleString()}</span>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-6">Organization</th>
                <th className="py-3.5">Plan</th>
                <th className="py-3.5">Payment ID</th>
                <th className="py-3.5">Amount</th>
                <th className="py-3.5">Method</th>
                <th className="py-3.5">Date</th>
                <th className="py-3.5 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {!payments || payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-dark-800/40 transition">
                    <td className="py-4 pl-6">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {p.organizationId?.name || 'Customer Organization'}
                      </span>
                      <span className="text-[10px] text-slate-400">{p.organizationId?.email || 'N/A'}</span>
                    </td>

                    <td className="py-4 font-bold text-primary-600 dark:text-primary-400">
                      {p.planId?.name || 'Subscription'}
                    </td>

                    <td className="py-4 font-mono text-[11px] text-slate-600 dark:text-dark-300">
                      {p.paymentId || p.orderId || 'N/A'}
                    </td>

                    <td className="py-4 font-black text-slate-900 dark:text-white">
                      ₹{p.amount?.toLocaleString() || 0}
                    </td>

                    <td className="py-4 capitalize text-slate-600 dark:text-dark-300">
                      {p.paymentMethod || 'Online'} &bull; {p.provider}
                    </td>

                    <td className="py-4 text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date(p.createdAt).toLocaleString()}
                    </td>

                    <td className="py-4 pr-6 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        p.status === 'captured' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {p.status}
                      </span>
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
