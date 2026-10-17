import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { 
  Building2, Briefcase, FileSignature, Wallet, ChevronRight, 
  ChevronLeft, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';

const onboardingSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  businessType: z.enum(['general', 'loan', 'registration', 'certification', 'custom']),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  gstin: z.string().length(15, 'GSTIN must be exactly 15 characters').optional().or(z.literal('')),
  pan: z.string().length(10, 'PAN must be exactly 10 characters').optional().or(z.literal('')),
  template: z.string().default('general_sales')
});

type OnboardingFields = z.infer<typeof onboardingSchema>;

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, organizations, isAuthenticated, setOrganizations, setActiveOrganizationId } = useAuthStore();
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (organizations && organizations.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm<OnboardingFields>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      businessType: 'general',
      phone: '',
      email: user?.email || '',
      website: '',
      gstin: '',
      pan: '',
      template: 'general_sales'
    }
  });

  const selectedBusinessType = watch('businessType');

  // Sync template choice based on business category choice
  React.useEffect(() => {
    if (selectedBusinessType === 'loan') {
      setValue('template', 'business_loan');
    } else if (selectedBusinessType === 'registration' || selectedBusinessType === 'certification') {
      setValue('template', 'registration_certification');
    } else {
      setValue('template', 'general_sales');
    }
  }, [selectedBusinessType, setValue]);

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await trigger(['name', 'phone', 'email', 'website']);
      if (!isValid) {
        setErrorMsg('Please fix the errors in your company profile before continuing.');
        return;
      }
    }
    setErrorMsg(null);
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  const onSubmit = async (data: OnboardingFields) => {
    setErrorMsg(null);
    try {
      // 1. Onboard organization API request
      const response = await api.post('/organizations/onboard', {
        name: data.name,
        businessType: data.businessType,
        phone: data.phone,
        email: data.email,
        website: data.website,
        gstin: data.gstin,
        pan: data.pan
      });

      // 2. Fetch fresh user context to load the newly affiliated organization
      const meResponse = await api.get('/auth/me');
      const { organizations } = meResponse.data.data;
      
      setOrganizations(organizations);
      
      const newOrgId = response.data.data._id;
      setActiveOrganizationId(newOrgId);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to complete onboarding. Please verify details.';
      setErrorMsg(msg);
    }
  };

  const businessTypes = [
    { value: 'general', label: 'General Sales & Service', icon: Building2, desc: 'For general trade, product sales, and custom consulting.' },
    { value: 'loan', label: 'Business Loan Consultancy', icon: Wallet, desc: 'Auto-configures document checklists and bank processing workflows.' },
    { value: 'registration', label: 'Business Registration Services', icon: FileSignature, desc: 'Configures government processing and company filing tracking.' },
    { value: 'certification', label: 'Certification Services', icon: CheckCircle, desc: 'Configures audit, verification, and certificate dispatch stages.' },
    { value: 'custom', label: 'Other Consulting Business', icon: Briefcase, desc: 'A blank canvas setup to map your custom pipelines.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex items-center justify-center p-6 transition-colors duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
        
        {/* Progress Tracker bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Workspace Configuration Wizard</h1>
            <p className="text-sm text-slate-500 dark:text-dark-400">Configure your company settings and service templates.</p>
          </div>
          <div className="text-sm font-semibold text-slate-400 dark:text-dark-500">
            Step {step} of 3
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* STEP 1: Basic Company Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">1. Company Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Company / Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ArthaVenture Consultants"
                    {...register('name')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Company Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="9999999999"
                    {...register('phone')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="info@arthaventure.com"
                    {...register('email')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.arthaventure.com"
                    {...register('website')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.website && <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business Type selection */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">2. Select Business Operations Category</h2>
              <p className="text-xs text-slate-400 dark:text-dark-500">This pre-configures custom status pipelines, CRM checklists, and tax settings.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessTypes.map(t => {
                  const Icon = t.icon;
                  const isSelected = selectedBusinessType === t.value;
                  return (
                    <div
                      key={t.value}
                      onClick={() => setValue('businessType', t.value as any)}
                      className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10' 
                          : 'border-slate-100 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-800/40'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mr-3 ${
                        isSelected ? 'bg-primary-100 text-primary-600 dark:bg-primary-900' : 'bg-slate-100 text-slate-500 dark:bg-dark-800'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{t.label}</h3>
                        <p className="text-[11px] text-slate-400 dark:text-dark-500 mt-0.5 leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Indian Tax & GST configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">3. Tax and Statutory Details (India)</h2>
              <p className="text-xs text-slate-400 dark:text-dark-500">Configure Indian GST tax profiles to generate professional billing receipts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="27AAAAA1111A1Z1"
                    maxLength={15}
                    {...register('gstin')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.gstin && <p className="mt-1 text-xs text-red-500">{errors.gstin.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Company PAN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    {...register('pan')}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {errors.pan && <p className="mt-1 text-xs text-red-500">{errors.pan.message}</p>}
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-dark-950/40 rounded-2xl flex items-center justify-between text-xs text-slate-500">
                <span>By finalizing, we will pre-configure GST components (CGST, SGST, IGST) with standard 18% tax rates.</span>
              </div>
            </div>
          )}

          {/* Form Actions footer */}
          <div className="flex justify-between items-center border-t border-slate-100 dark:border-dark-800 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 dark:text-dark-300 text-sm font-semibold"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-tri-45 font-bold py-2 px-5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 active:scale-95"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-green-45 font-bold py-2 px-5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Configuring CRM...</span>
                  </>
                ) : (
                  <>
                    <span>Finish Setup</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
