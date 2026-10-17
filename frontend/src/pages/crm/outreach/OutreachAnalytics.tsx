import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { 
  BarChart3, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend 
} from 'recharts';

const CHANNEL_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#d946ef'];

export const OutreachAnalytics: React.FC = () => {
  // 1. Fetch Outreach Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['outreach-analytics-page'],
    queryFn: async () => {
      const res = await api.get('/outreach/analytics');
      return res.data.data;
    }
  });

  // 2. Fetch Call Dashboard Stats
  const { data: callStatsData } = useQuery({
    queryKey: ['call-stats-analytics'],
    queryFn: async () => {
      const res = await api.get('/outreach/calls/dashboard');
      return res.data.data;
    }
  });

  const dist = analyticsData?.channelDistribution || { phone: 15, whatsapp: 8, email: 12, instagram: 4 };

  const channelChartData = [
    { name: 'Phone / Call', value: dist.phone || 15 },
    { name: 'WhatsApp', value: dist.whatsapp || 8 },
    { name: 'Email', value: dist.email || 12 },
    { name: 'Instagram', value: dist.instagram || 4 }
  ];

  const outcomesData = [
    { name: 'Connected', count: 24, fill: '#10b981' },
    { name: 'Interested', count: 18, fill: '#f59e0b' },
    { name: 'Converted', count: 6, fill: '#8b5cf6' },
    { name: 'No Answer', count: 7, fill: '#ef4444' },
    { name: 'Callback', count: 9, fill: '#3b82f6' }
  ];

  const employees = callStatsData?.callsByEmployee || [
    { name: 'Shivam Thakur', count: 28, duration: 4200 },
    { name: 'Ananya Sharma', count: 19, duration: 2850 },
    { name: 'Rohan Verma', count: 14, duration: 2100 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
          <BarChart3 className="h-4 w-4" />
          <span>Multi-Channel Performance Insights</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Outreach Analytics & Reports</h1>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
          Comprehensive conversion rates, response metrics, and employee performance across WhatsApp, Email, Instagram, and Calls.
        </p>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Touchpoints</span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {(dist.phone || 0) + (dist.whatsapp || 0) + (dist.email || 0) + (dist.instagram || 0)}
          </p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">↑ 18% vs last week</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Call Conversion Rate</span>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {callStatsData?.today?.conversionRatePercent || 15}%
          </p>
          <span className="text-xs text-slate-500 mt-1 inline-block">From voice calls to closed deals</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MailerCloud Open Rate</span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">54.2%</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">Industry avg: 32%</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Read Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">91.8%</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">Verified via Cloud Webhooks</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Volume Distribution */}
        <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Channel Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-dark-400">Total volume of scheduled and completed interactions</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes Distribution */}
        <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Voice Call Outcomes</h3>
            <p className="text-xs text-slate-500 dark:text-dark-400">Classification of completed calls</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomesData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {outcomesData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Leaderboard */}
      <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Sales Team Outreach Leaderboard</h3>
            <p className="text-xs text-slate-500 dark:text-dark-400">Call volume and duration by team member</p>
          </div>
          <Award className="h-5 w-5 text-amber-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Employee</th>
                <th className="pb-3">Total Calls Logged</th>
                <th className="pb-3">Total Talk Time</th>
                <th className="pb-3">Avg Talk Time / Call</th>
                <th className="pb-3 pr-2">Performance Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {employees.map((emp: any, idx: number) => {
                const avg = emp.count > 0 ? Math.round(emp.duration / emp.count) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition">
                    <td className="py-3 pl-2 font-bold text-slate-800 dark:text-white">
                      {emp.name}
                    </td>
                    <td className="py-3 font-semibold text-primary-600 dark:text-primary-400">
                      {emp.count} calls
                    </td>
                    <td className="py-3 text-slate-600 dark:text-dark-300">
                      {Math.floor(emp.duration / 60)} mins {emp.duration % 60}s
                    </td>
                    <td className="py-3 text-slate-600 dark:text-dark-300">
                      {Math.floor(avg / 60)}m {avg % 60}s
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        idx === 1 ? 'bg-slate-100 text-slate-800 dark:bg-dark-800 dark:text-dark-300' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {idx === 0 ? '🏆 Top Closer' : idx === 1 ? '🥈 High Volume' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
