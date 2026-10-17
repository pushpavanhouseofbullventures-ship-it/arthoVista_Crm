import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const PricingPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Dynamically load plans from backend API
  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const res = await api.get('/plans');
      return res.data.data;
    }
  });

  const handleSelectPlan = (_plan: any) => {
    if (!isAuthenticated) {
      navigate('/register');
    } else {
      navigate('/settings/billing');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-orange-500/10 via-blue-500/10 to-emerald-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Transparent, Admin-Configured Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Plans that Scale with Your Sales Engine
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-dark-400">
            Multi-channel outreach across WhatsApp, Email, Instagram, and Phone Calls with AI Call Briefs and automated sequences.
          </p>
        </div>

        {/* Dynamic Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!plans || plans.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              Loading pricing plans...
            </div>
          ) : (
            plans.map((p: any) => {
              const isPro = p.slug === 'professional' || p.isDefault;
              return (
                <div
                  key={p._id}
                  className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative ${
                    isPro 
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl ring-2 ring-blue-500 scale-[1.03] z-10' 
                      : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm text-slate-900 dark:text-white hover:shadow-md'
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 btn-tri-45 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow">
                      Most Popular Tier
                    </span>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-black">{p.name}</h3>
                      <p className={`text-xs mt-1 min-h-[32px] ${isPro ? 'text-indigo-200' : 'text-slate-500 dark:text-dark-400'}`}>
                        {p.description || 'Comprehensive CRM package.'}
                      </p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-3xl sm:text-4xl font-black">₹{p.price.toLocaleString()}</span>
                      <span className={`text-xs ml-2 font-semibold ${isPro ? 'text-indigo-200' : 'text-slate-400'}`}>
                        / {p.duration} {p.durationUnit}
                      </span>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2.5 text-xs pt-4 border-t border-slate-100 dark:border-dark-800/80">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span className="font-bold">
                          {p.maxUsers === -1 ? 'Unlimited Team Seats' : `Up to ${p.maxUsers} User Seats`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span>{p.limits?.leads?.toLocaleString() || '1,000'} Leads Capacity</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span>{p.limits?.campaigns || '20'} Outreach Campaigns</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        <span>{p.limits?.invoices || '50'} Monthly Invoices</span>
                      </div>

                      {p.features?.whatsapp && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span>WhatsApp Business API</span>
                        </div>
                      )}

                      {p.features?.email && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span>MailerCloud Email Delivery</span>
                        </div>
                      )}

                      {p.features?.phoneCalls && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`h-4 w-4 ${isPro ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          <span>Voice Calls & Telephony</span>
                        </div>
                      )}

                      {p.features?.aiCopilot && (
                        <div className="flex items-center space-x-2 font-bold text-amber-400">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <span>AI Call Brief & Copilot</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleSelectPlan(p)}
                      className={`w-full py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center space-x-2 active:scale-95 ${
                        isPro 
                          ? 'btn-tri-45 text-white' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                      }`}
                    >
                      <span>{p.price === 0 ? 'Get Started Free' : 'Choose Plan'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Back Link */}
        <div className="text-center pt-6">
          <Link to="/dashboard" className="text-xs font-bold text-blue-600 hover:text-orange-600 dark:text-blue-400 dark:hover:text-orange-400 transition hover:underline">
            &larr; Back to Application Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
