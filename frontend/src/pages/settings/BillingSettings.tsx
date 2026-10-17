import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  CreditCard, CheckCircle2, 
  Layers, Sparkles, CheckCircle, 
  ExternalLink, X, ShieldCheck, AlertCircle, Copy, Check, Smartphone
} from 'lucide-react';

export const BillingSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);
  const [userPaymentId, setUserPaymentId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);

  // 1. Fetch Subscription & Live Usage
  const { data: billingData } = useQuery({
    queryKey: ['org-billing-subscription'],
    queryFn: async () => {
      const res = await api.get('/billing/subscription');
      return res.data.data;
    }
  });

  // 2. Fetch Available Plans
  const { data: plans } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const res = await api.get('/plans');
      return res.data.data;
    }
  });

  // Verify Payment Mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/billing/verify-payment', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['org-billing-subscription'] });
      setPaymentSuccessMsg(data.message || 'Subscription successfully updated!');
      setCheckoutPlan(null);
      setCheckoutOrder(null);
      setUserPaymentId('');
      setPaymentError(null);
      setTimeout(() => setPaymentSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setPaymentError(err.response?.data?.message || 'Payment verification failed. Please check your Reference ID.');
    }
  });

  const handleStartCheckout = async (plan: any) => {
    setIsInitiating(true);
    setPaymentError(null);
    try {
      const orderRes = await api.post('/billing/create-order', { planId: plan._id });
      const orderData = orderRes.data;

      // If ₹0 plan (e.g. Free Trial), activate immediately
      if (orderData.isFreePlan) {
        queryClient.invalidateQueries({ queryKey: ['org-billing-subscription'] });
        setPaymentSuccessMsg(`Plan "${plan.name}" activated successfully!`);
        setIsInitiating(false);
        setTimeout(() => setPaymentSuccessMsg(null), 3000);
        return;
      }

      // For paid plans, set order and open Razorpay payment modal
      setCheckoutPlan(plan);
      setCheckoutOrder(orderData.data);
      setIsInitiating(false);

      // If Razorpay SDK is available and key is configured, open popup
      const { orderId, amount, currency, keyId } = orderData.data;
      const Razorpay = (window as any).Razorpay;
      if (typeof Razorpay !== 'undefined' && keyId && keyId !== 'rzp_test_placeholder') {
        const options = {
          key: keyId,
          amount: amount * 100,
          currency,
          name: 'ArthaVenture SaaS',
          description: `${plan.name} Subscription Plan`,
          order_id: orderId,
          handler: function (response: any) {
            verifyPaymentMutation.mutate({
              planId: plan._id,
              orderId: response.razorpay_order_id || orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
          },
          theme: {
            color: '#6366f1'
          }
        };
        const rzp = new Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setIsInitiating(false);
      alert(err.response?.data?.message || 'Failed to initiate checkout.');
    }
  };

  const handleCopyAmount = (amount: number) => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleManualVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPaymentId.trim()) {
      setPaymentError('Please enter your Razorpay Payment ID or Transaction UTR number.');
      return;
    }

    verifyPaymentMutation.mutate({
      planId: checkoutPlan._id,
      orderId: checkoutOrder?.orderId || `order_${Date.now()}`,
      paymentId: userPaymentId.trim(),
      signature: `manual_ref_${Date.now()}`
    });
  };

  const subscription = billingData?.subscription;
  const usage = billingData?.usage || { users: 1, leads: 0, campaigns: 0, invoices: 0 };
  const daysRemaining = billingData?.daysRemaining ?? 30;
  const limits = subscription?.limitsAtPurchase || {};
  const features = subscription?.featuresAtPurchase || {};
  const payments = billingData?.payments || [];

  const maxUsers = subscription?.maxUsersAtPurchase === -1 ? 'Unlimited' : (subscription?.maxUsersAtPurchase || 3);
  const maxLeads = limits.leads === -1 ? 'Unlimited' : (limits.leads || 1000);
  const maxCampaigns = limits.campaigns === -1 ? 'Unlimited' : (limits.campaigns || 20);

  const usersPct = typeof maxUsers === 'number' ? Math.min(100, Math.round((usage.users / maxUsers) * 100)) : 10;
  const leadsPct = typeof maxLeads === 'number' ? Math.min(100, Math.round((usage.leads / maxLeads) * 100)) : 5;
  const campaignsPct = typeof maxCampaigns === 'number' ? Math.min(100, Math.round((usage.campaigns / maxCampaigns) * 100)) : 10;

  // Generate UPI URI with prefilled amount and note
  const upiIntentUri = checkoutPlan 
    ? `upi://pay?pa=shiv6228@razorpay&pn=Shiv%20Thakur&am=${checkoutPlan.price}&cu=INR&tn=${encodeURIComponent(checkoutPlan.name + ' Plan Subscription')}`
    : '';

  const qrCodeUrl = checkoutPlan
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiIntentUri)}`
    : '';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-1">
          <CreditCard className="h-4 w-4" />
          <span>Subscription & Resource Quotas</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Workspace Billing</h1>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
          Monitor your subscription tier, track live resource utilization against plan limits, and upgrade seamlessly.
        </p>
      </div>

      {paymentSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{paymentSuccessMsg}</span>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      {subscription && (
        <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800 pb-5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400 flex items-center justify-center font-black text-xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{subscription.planName} Plan</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    subscription.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    subscription.status === 'trial' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                    subscription.status === 'suspended' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">
                  ₹{subscription.priceAtPurchase?.toLocaleString() || 0} / {subscription.durationAtPurchase} {subscription.durationUnitAtPurchase}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Expiry</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                {new Date(subscription.endDate).toLocaleDateString()}
              </span>
              <span className={`text-xs font-bold ${daysRemaining < 7 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {daysRemaining} Days Remaining
              </span>
            </div>
          </div>

          {/* Live Resource Usage Bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Team Members */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Team Seats</span>
                <span className="font-bold text-slate-900 dark:text-white">{usage.users} / {maxUsers}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${usersPct > 85 ? 'bg-rose-500' : 'bg-primary-600'}`} style={{ width: `${usersPct}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-400">{usersPct}% allocated</span>
            </div>

            {/* Leads Quota */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Leads Capacity</span>
                <span className="font-bold text-slate-900 dark:text-white">{usage.leads} / {maxLeads.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${leadsPct > 85 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${leadsPct}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-400">{leadsPct}% utilized</span>
            </div>

            {/* Campaigns Quota */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Outreach Campaigns</span>
                <span className="font-bold text-slate-900 dark:text-white">{usage.campaigns} / {maxCampaigns}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-dark-800 h-2.5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${campaignsPct > 85 ? 'bg-rose-500' : 'bg-purple-600'}`} style={{ width: `${campaignsPct}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-400">{campaignsPct}% active</span>
            </div>
          </div>

          {/* Enabled Features in Current Subscription */}
          <div className="border-t border-slate-100 dark:border-dark-800 pt-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Included Features</span>
            <div className="flex flex-wrap gap-2">
              {features.whatsapp && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp Business</span>
                </span>
              )}
              {features.email && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>MailerCloud Email</span>
                </span>
              )}
              {features.instagram && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Instagram DM</span>
                </span>
              )}
              {features.phoneCalls && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Voice Calls & Telephony</span>
                </span>
              )}
              {features.aiCopilot && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Call Brief & Copilot</span>
                </span>
              )}
              {features.automation && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Automated Sequences</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Plans for Upgrade or Renewal */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upgrade or Renew Your Subscription</h2>
          <p className="text-xs text-slate-500 dark:text-dark-400">
            Select a plan to immediately expand your team limits and communication channels via secure Razorpay checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(plans || []).map((p: any) => {
            const isCurrent = subscription?.planName === p.name;

            return (
              <div
                key={p._id}
                className={`p-6 rounded-3xl bg-white dark:bg-dark-900 border transition shadow-sm flex flex-col justify-between space-y-6 ${
                  isCurrent 
                    ? 'border-primary-500 ring-2 ring-primary-500/20' 
                    : 'border-slate-200 dark:border-dark-800 hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{p.name}</h3>
                      {isCurrent && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 uppercase">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">₹{p.price.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 ml-1.5 font-semibold">/ {p.duration} {p.durationUnit}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-dark-300 border-t border-slate-100 dark:border-dark-800 pt-3">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{p.maxUsers === -1 ? 'Unlimited Users' : `Up to ${p.maxUsers} Users`}</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{p.limits?.leads?.toLocaleString() || '1,000'} Leads</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{p.limits?.campaigns || '20'} Campaigns</span>
                    </li>
                    {p.features?.aiCopilot && (
                      <li className="flex items-center space-x-2 font-bold text-purple-600 dark:text-purple-400">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                        <span>AI Call Brief & Copilot</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <button
                    onClick={() => handleStartCheckout(p)}
                    disabled={isInitiating}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm active:scale-95 ${
                      isCurrent
                        ? 'btn-green-45 text-white'
                        : 'btn-tri-45 text-white'
                    }`}
                  >
                    {isInitiating ? 'Processing...' : p.price === 0 ? 'Activate Trial' : isCurrent ? 'Renew Plan' : 'Select Plan & Pay'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RAZORPAY PAYMENT & ACTIVATION MODAL */}
      {checkoutPlan && checkoutOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Razorpay Secure Checkout</h3>
              </div>
              <button onClick={() => setCheckoutPlan(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Order Summary & Highlighted Amount */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-100 dark:border-dark-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Plan Tier:</span>
                <span className="font-bold text-slate-900 dark:text-white">{checkoutPlan.name} ({checkoutPlan.duration} {checkoutPlan.durationUnit})</span>
              </div>
              
              <div className="flex justify-between items-center bg-white dark:bg-dark-900 p-3 rounded-xl border border-slate-200 dark:border-dark-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount to Pay</span>
                  <span className="text-xl font-black text-primary-600 dark:text-primary-400">₹{checkoutPlan.price.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyAmount(checkoutPlan.price)}
                  className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-bold text-xs flex items-center space-x-1 hover:bg-primary-100 transition"
                  title="Copy amount to clipboard"
                >
                  {copiedAmount ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedAmount ? 'Copied ₹' + checkoutPlan.price : 'Copy Amount'}</span>
                </button>
              </div>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Step 1: Payment Options (Dynamic UPI QR & Direct Link) */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 flex items-center justify-center text-[10px] font-black">1</span>
                <span>Complete Payment (₹{checkoutPlan.price.toLocaleString()})</span>
              </span>

              {/* QR Code and Quick Pay container */}
              <div className="p-4 bg-slate-50 dark:bg-dark-950/50 rounded-2xl border border-slate-100 dark:border-dark-800 flex flex-col sm:flex-row items-center gap-4">
                {/* Dynamic QR Code */}
                <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-700 flex-shrink-0 text-center">
                  <img
                    src={qrCodeUrl}
                    alt={`Scan to Pay ₹${checkoutPlan.price}`}
                    className="w-28 h-28 mx-auto"
                  />
                  <span className="text-[9px] font-bold text-slate-500 mt-1 block">Scan with GPay / PhonePe</span>
                </div>

                <div className="space-y-2 flex-1 w-full text-xs">
                  <p className="text-slate-600 dark:text-dark-300 text-[11px]">
                    Scan QR code above with any UPI app to pay <strong className="text-slate-900 dark:text-white">₹{checkoutPlan.price.toLocaleString()}</strong> with amount pre-filled, or click the button below:
                  </p>
                  
                  {/* Direct Link button */}
                  <a
                    href={checkoutOrder.businessPaymentUrl || 'https://razorpay.me/@shiv6228'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5 text-xs"
                  >
                    <span>Open Razorpay Link ({checkoutOrder.businessPaymentUrl || 'razorpay.me/@shiv6228'})</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {/* Direct UPI Intent Link for mobile users */}
                  <a
                    href={upiIntentUri}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-xl border border-emerald-200 dark:border-emerald-900 transition flex items-center justify-center space-x-1.5 text-[11px]"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Instant Pay ₹{checkoutPlan.price} via UPI App</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2: Enter Payment / UTR Reference */}
            <form onSubmit={handleManualVerificationSubmit} className="space-y-3 pt-2 border-t border-slate-100 dark:border-dark-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 flex items-center justify-center text-[10px] font-black">2</span>
                <span>Enter Payment Reference & Activate Plan</span>
              </span>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Razorpay Payment ID / Transaction UTR / Ref Number:
                </label>
                <input
                  type="text"
                  value={userPaymentId}
                  onChange={(e) => setUserPaymentId(e.target.value)}
                  placeholder="e.g. pay_Pxyz123456 or 4235XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 dark:bg-dark-800 dark:border-dark-700 dark:text-dark-100 outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutPlan(null)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-dark-300 dark:hover:bg-dark-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyPaymentMutation.isPending || !userPaymentId.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {verifyPaymentMutation.isPending ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Activate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Workspace Payment History</h3>
          <p className="text-xs text-slate-500 dark:text-dark-400">Official billing receipts and transaction IDs</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No payment history recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition">
                    <td className="py-3 pl-2 font-mono text-[11px] text-slate-700 dark:text-dark-200">
                      {p.paymentId || p.orderId}
                    </td>
                    <td className="py-3 font-semibold text-primary-600 dark:text-primary-400">
                      {p.planId?.name || 'Subscription Tier'}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
