import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Loader2, AlertCircle, IndianRupee, BarChart3, Clock, ShieldAlert
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  
  // Fetch Reports Aggregation Summary
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: async () => {
      const response = await api.get('/reports/summary');
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="p-6 text-center bg-white dark:bg-dark-900 border rounded-3xl">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800 dark:text-white">Reporting load failed</h3>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-1">Verify your role has sufficient access rights (accounting:read).</p>
      </div>
    );
  }

  const { financials, aging, pipeline, auditLogs } = summary;

  // Aging brackets calculations
  const totalAgingVal = aging.totalAging || 1; // avoid divide by zero
  const pctBracket1 = Math.round((aging.bracket1to30 / totalAgingVal) * 100);
  const pctBracket2 = Math.round((aging.bracket31to60 / totalAgingVal) * 100);
  const pctBracket3 = Math.round((aging.bracket61to90 / totalAgingVal) * 100);
  const pctBracket4 = Math.round((aging.bracket91plus / totalAgingVal) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Audit Trails</h1>
        <p className="text-xs text-slate-500 dark:text-dark-400">Review business metrics, track tax breakdowns, monitor sales forecasts, and inspect employee operations.</p>
      </div>

      {/* Grid 1: Financial Analytics Ledger Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Invoiced Sales */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-2">
          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gross Sales Invoiced</span>
          <div className="flex items-center text-xl font-black text-slate-900 dark:text-white">
            <IndianRupee className="h-4.5 w-4.5 text-slate-500 mr-0.5" />
            <span>{financials.totalInvoiced.toLocaleString()}</span>
          </div>
          <span className="block text-[9px] text-slate-400 font-medium">Net Corporate Value: ₹{financials.netSubtotal.toLocaleString()}</span>
        </div>

        {/* Taxes splits */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-2">
          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Collected GST (18%)</span>
          <div className="flex items-center text-xl font-black text-blue-650 dark:text-blue-400">
            <IndianRupee className="h-4.5 w-4.5 mr-0.5" />
            <span>{financials.taxTotal.toLocaleString()}</span>
          </div>
          <span className="block text-[9px] text-slate-400 font-medium">CGST (9%): ₹{financials.cgstCollected.toLocaleString()} | SGST (9%): ₹{financials.sgstCollected.toLocaleString()}</span>
        </div>

        {/* Total revenue collected */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-2">
          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Collected Revenue</span>
          <div className="flex items-center text-xl font-black text-green-650 dark:text-green-400">
            <IndianRupee className="h-4.5 w-4.5 mr-0.5" />
            <span>{financials.totalCollected.toLocaleString()}</span>
          </div>
          <span className="block text-[9px] text-green-600 font-semibold uppercase tracking-wider text-[8px] bg-green-50 px-2 py-0.5 rounded w-max">Liquid Cash</span>
        </div>

        {/* Receivables outstanding */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm space-y-2">
          <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Receivables</span>
          <div className="flex items-center text-xl font-black text-orange-655 dark:text-orange-400">
            <IndianRupee className="h-4.5 w-4.5 mr-0.5" />
            <span>{financials.totalOutstanding.toLocaleString()}</span>
          </div>
          <span className="block text-[9px] text-orange-650 font-semibold uppercase tracking-wider text-[8px] bg-orange-50 px-2 py-0.5 rounded w-max">Unpaid Balances</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Overdue Aging Invoice log */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
              <Clock className="h-4.5 w-4.5 text-slate-500" />
              <span>Overdue Invoices Aging</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Banded total outstanding receivables across due date intervals.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-500">
            {/* Bracket 1 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>1 - 30 Days Overdue</span>
                <span className="text-slate-800 dark:text-white">₹{aging.bracket1to30.toLocaleString()} ({pctBracket1}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pctBracket1}%` }}></div>
              </div>
            </div>

            {/* Bracket 2 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>31 - 60 Days Overdue</span>
                <span className="text-slate-800 dark:text-white">₹{aging.bracket31to60.toLocaleString()} ({pctBracket2}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${pctBracket2}%` }}></div>
              </div>
            </div>

            {/* Bracket 3 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>61 - 90 Days Overdue</span>
                <span className="text-slate-800 dark:text-white">₹{aging.bracket61to90.toLocaleString()} ({pctBracket3}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full rounded-full transition-all" style={{ width: `${pctBracket3}%` }}></div>
              </div>
            </div>

            {/* Bracket 4 */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>91+ Days Overdue (Critical)</span>
                <span className="text-slate-850 dark:text-white">₹{aging.bracket91plus.toLocaleString()} ({pctBracket4}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-700 h-full rounded-full transition-all" style={{ width: `${pctBracket4}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales opportunity pipeline forecast */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                <BarChart3 className="h-4.5 w-4.5 text-slate-500" />
                <span>Sales Forecast & Win Metrics</span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Stage breakdown of pipeline conversion forecasts.</p>
            </div>
            <div className="text-right">
              <span className="block text-[8px] text-slate-400 font-bold uppercase">Weighted Expected Value</span>
              <span className="text-base font-black text-primary-600 dark:text-primary-400">₹{pipeline.totalExpectedValue.toLocaleString()}</span>
            </div>
          </div>

          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-dark-800 pb-2">
                  <th className="pb-2 font-bold uppercase text-[9px]">Pipeline Stage</th>
                  <th className="pb-2 text-center font-bold uppercase text-[9px]">Deals Count</th>
                  <th className="pb-2 text-right font-bold uppercase text-[9px]">Total Value (₹)</th>
                  <th className="pb-2 text-center font-bold uppercase text-[9px]">Win %</th>
                  <th className="pb-2 text-right font-bold uppercase text-[9px]">Expected Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-dark-800/40">
                {pipeline.breakdown.map((row: any, idx: number) => (
                  <tr key={idx} className="text-slate-700 dark:text-dark-300">
                    <td className="py-2.5 font-semibold text-slate-900 dark:text-white capitalize">{row.stage.replace('_', ' ')}</td>
                    <td className="py-2.5 text-center font-mono">{row.count}</td>
                    <td className="py-2.5 text-right font-mono">₹{row.value.toLocaleString()}</td>
                    <td className="py-2.5 text-center">
                      <span className="bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">
                        {row.probability}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">₹{row.expected.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Operation Audit Trails logs table */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
            <ShieldAlert className="h-4.5 w-4.5 text-slate-500" />
            <span>System Audit Trails</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">A complete immutable record of operations performed inside your organization tenant.</p>
        </div>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-950 text-slate-550 dark:text-dark-500 text-[9px] font-bold uppercase border-b border-slate-100 dark:border-dark-800/80">
                <th className="py-3 px-4">Operator User</th>
                <th className="py-3 px-4">Operations Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Log Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/30">
              {auditLogs.map((log: any) => (
                <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/30 transition-colors text-slate-700 dark:text-dark-300">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System Engine'}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">{log.userId?.email || 'automated@arthaventure.com'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 text-slate-750 dark:bg-dark-800 dark:text-dark-250 px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize font-semibold">{log.entity}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-450">{log.entityId}</td>
                  <td className="py-3 px-4 max-w-xs truncate font-mono text-[9px]" title={JSON.stringify(log.newValue || log.oldValue || {})}>
                    {JSON.stringify(log.newValue || log.oldValue || {})}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400 text-[10px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
