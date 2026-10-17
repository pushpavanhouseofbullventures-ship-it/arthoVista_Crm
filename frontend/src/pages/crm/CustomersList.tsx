import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Search, Plus, Loader2, AlertCircle, Building2, Mail, Phone, 
  IndianRupee, ChevronRight
} from 'lucide-react';

export const CustomersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Customers
  const { data: customerData, isLoading, isError } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const response = await api.get('/customers', {
        params: { search: search || undefined, page, limit: 10 }
      });
      return response.data.data;
    }
  });

  // Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/customers', payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create customer. Please try again.';
      setErrorMsg(msg);
    }
  });

  const handleCreateCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name'),
      companyName: formData.get('companyName') || undefined,
      email: formData.get('email'),
      phone: formData.get('phone'),
      whatsApp: formData.get('whatsApp') || undefined,
      gstin: formData.get('gstin') || undefined,
      pan: formData.get('pan') || undefined,
      notes: formData.get('notes') || undefined
    };

    createCustomerMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Customers Master</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">View customer ledger summaries, corporate contacts, and credit standing.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-dark-800 rounded-xl bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Customers List grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500 mb-2" />
            <span>Loading customers list...</span>
          </div>
        ) : isError || !customerData || customerData.customers.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-400 bg-white dark:bg-dark-900 border rounded-2xl">
            <Building2 className="h-8 w-8 mx-auto text-slate-300 dark:text-dark-700 mb-2" />
            <p className="font-semibold text-slate-500">No customers registered</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Convert a qualified lead or add a customer manually to get started.</p>
          </div>
        ) : (
          customerData.customers.map((cust: any) => (
            <div key={cust._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-primary-400 dark:hover:border-primary-600 transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{cust.name}</h3>
                    <div className="inline-flex items-center space-x-1 text-xs text-primary-600 dark:text-primary-400 font-mono font-bold mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>Primary ID: {cust.phone || cust.customerId}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300 px-2.5 py-0.5 rounded-full font-semibold uppercase">
                    {cust.companyName || 'Individual'}
                  </span>
                </div>

                <div className="space-y-2 border-t border-b border-slate-100 dark:border-dark-800/80 py-3.5 text-xs text-slate-650 dark:text-dark-300">
                  <div className="flex items-center space-x-2.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.gstin && (
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[9px] bg-slate-100 dark:bg-dark-800 text-slate-500 font-bold px-1 py-0.5 rounded">GST</span>
                      <span className="font-mono">{cust.gstin}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Running Balance footer */}
              <div className="flex items-center justify-between pt-4 mt-2">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">Ledger Balance</span>
                  <div className="flex items-center text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                    <IndianRupee className="h-3.5 w-3.5 text-slate-500" />
                    <span>{cust.outstandingBalance?.toLocaleString() || '0.00'}</span>
                  </div>
                </div>

                <button className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs font-bold inline-flex items-center">
                  <span>View Details</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Slide-out modal manual creation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-800 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="pb-4 border-b border-slate-100 dark:border-dark-800 mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Register Customer</h2>
                <p className="text-xs text-slate-400 dark:text-dark-500">Add a client profile to database directories.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-lg flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form id="add-customer-form" onSubmit={handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="Aditya Birla Group"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="accounts@domain.com"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="phone"
                      required
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      name="whatsApp"
                      placeholder="9876543210"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      Company / Organization Name
                    </label>
                    <input
                      name="companyName"
                      placeholder="AB Birla Ltd"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      GSTIN Number
                    </label>
                    <input
                      name="gstin"
                      placeholder="27AAAAA1111A1Z1"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      PAN Number
                    </label>
                    <input
                      name="pan"
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Special notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="E.g. Corporate client with multiple loan request portfolios."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="flex justify-end space-x-3 border-t border-slate-100 dark:border-dark-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-dark-800 text-slate-700 dark:text-dark-300 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-customer-form"
                disabled={createCustomerMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition active:scale-95"
              >
                {createCustomerMutation.isPending ? 'Saving...' : 'Register Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
