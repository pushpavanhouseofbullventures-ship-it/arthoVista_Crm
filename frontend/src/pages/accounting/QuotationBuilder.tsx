import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Plus, Trash2, ArrowLeft, CheckCircle2,
  Send, Printer, RefreshCw, Eye, Edit3,
  Check
} from 'lucide-react';

interface LineItem {
  itemId?: string;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  gstRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}

// Convert amount to Indian Rupees in words
function numberToWordsINR(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  };

  const whole = Math.floor(num);
  const words = inWords(whole).trim();
  return words ? `Rupees ${words} Only` : 'Zero Rupees Only';
}

export const QuotationBuilder: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadIdParam = searchParams.get('leadId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEdit = !!id && id !== 'new';
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(isEdit ? 'preview' : 'edit');

  const [leadId, setLeadId] = useState<string>(leadIdParam || '');
  const [customerId, setCustomerId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<LineItem[]>([
    {
      name: 'Real Estate & Financial Advisory Services',
      description: 'Comprehensive property asset advisory, valuation, and transaction consulting setup.',
      quantity: 1,
      rate: 15000,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 18,
      taxAmount: 2700,
      subtotal: 15000,
      total: 17700
    }
  ]);
  const [notes, setNotes] = useState('Thank you for considering our services. We look forward to a successful and long-term partnership.');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Quotation is valid for 30 days from the date of issuance.\n2. 50% advance upon contract signing / token confirmation, balance upon final settlement.\n3. All statutory GST charges apply as per government regulations.\n4. Upon acceptance, this quotation can be directly converted into an official Tax Invoice.'
  );

  // Fetch Existing Quotation if Edit
  const { data: existingQuotation, isLoading: isLoadingQuotation } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!isEdit) return null;
      const res = await api.get(`/quotations/${id}`);
      return res.data.data;
    },
    enabled: isEdit
  });

  // Fetch Leads for dropdown
  const { data: leadsData } = useQuery({
    queryKey: ['leads-dropdown'],
    queryFn: async () => {
      const res = await api.get('/leads', { params: { limit: 100 } });
      return res.data.data.leads;
    }
  });

  // Load existing data into state
  useEffect(() => {
    if (existingQuotation) {
      const lId = existingQuotation.leadId?._id || existingQuotation.leadId?.id || existingQuotation.leadId;
      if (lId && typeof lId === 'string') setLeadId(lId);

      const cId = existingQuotation.customerId?._id || existingQuotation.customerId?.id || existingQuotation.customerId;
      if (cId && typeof cId === 'string') setCustomerId(cId);

      if (existingQuotation.date) setDate(new Date(existingQuotation.date).toISOString().split('T')[0]);
      if (existingQuotation.validUntil) setValidUntil(new Date(existingQuotation.validUntil).toISOString().split('T')[0]);
      if (existingQuotation.items && Array.isArray(existingQuotation.items) && existingQuotation.items.length > 0) {
        setItems(existingQuotation.items);
      }
      if (existingQuotation.notes) setNotes(existingQuotation.notes);
      if (existingQuotation.termsAndConditions) setTermsAndConditions(existingQuotation.termsAndConditions);
    }
  }, [existingQuotation]);

  // Recalculate item line values
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const gst = Number(item.gstRate) || 0;

    const rawSubtotal = qty * rate;
    const discountAmount = Math.round((rawSubtotal * (discPct / 100)) * 100) / 100;
    const subtotal = Math.max(0, rawSubtotal - discountAmount);
    const taxAmount = Math.round((subtotal * (gst / 100)) * 100) / 100;
    const total = subtotal + taxAmount;

    item.discountAmount = discountAmount;
    item.subtotal = subtotal;
    item.taxAmount = taxAmount;
    item.total = total;

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        name: '',
        description: '',
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        taxAmount: 0,
        subtotal: 0,
        total: 0
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      alert('Quotation must contain at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand totals
  const subtotalSum = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.rate)), 0);
  const totalDiscountSum = items.reduce((sum, it) => sum + (Number(it.discountAmount) || 0), 0);
  const taxableValue = subtotalSum - totalDiscountSum;
  const taxTotalSum = items.reduce((sum, it) => sum + (Number(it.taxAmount) || 0), 0);
  const grandTotal = taxableValue + taxTotalSum;

  // Selected lead object for rich presentation
  const selectedLead = (leadsData || []).find((l: any) => l._id === leadId || l.id === leadId) ||
    (existingQuotation?.leadId && typeof existingQuotation.leadId === 'object' ? existingQuotation.leadId : null);

  // Resolved quotation number
  const resolvedQuotationNo = existingQuotation?.quotationId ||
    (existingQuotation?.id ? `QT-${existingQuotation.id.substring(0, 8).toUpperCase()}` : 'QT-DRAFT');

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leadId: leadId || undefined,
        customerId: customerId || undefined,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items,
        notes,
        termsAndConditions
      };

      if (isEdit) {
        const res = await api.put(`/quotations/${id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/quotations', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      alert(data.message || 'Quotation saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      if (!isEdit && (data.data?._id || data.data?.id)) {
        navigate(`/accounting/quotations/${data.data._id || data.data.id}`);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save quotation.');
    }
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/quotations/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Status updated!');
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });

  // Convert to Invoice Mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/quotations/${id}/convert-to-invoice`, {});
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || 'Converted to invoice!');
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      if (data.data?.invoice?._id || data.data?.invoice?.id) {
        navigate(`/accounting/invoices/${data.data.invoice._id || data.data.invoice.id}`);
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Conversion failed.');
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingQuotation) {
    return <div className="py-16 text-center text-xs text-slate-400 font-semibold">Loading quotation details...</div>;
  }

  const currentStatus = existingQuotation?.status || 'draft';
  const isLocked = currentStatus === 'converted';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Top Control Header & Actions (Hidden during print) */}
      <div className="no-print bg-white dark:bg-dark-900 border border-slate-300 dark:border-dark-700 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to="/accounting/quotations"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-700 transition"
            title="Back to Quotations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-extrabold text-slate-950 dark:text-white truncate">
                {isEdit ? `Quotation #${resolvedQuotationNo}` : 'Create Commercial Quotation'}
              </h1>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${currentStatus === 'accepted' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300' :
                currentStatus === 'converted' ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300' :
                  currentStatus === 'sent' ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300' :
                    'bg-slate-200 text-slate-900 dark:bg-dark-800 dark:text-slate-200'
                }`}>
                {currentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              {isLocked ? 'Converted to Tax Invoice and locked from modifications.' : 'Configure scope of work, tax slabs, payment terms, and generate official PDF.'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-dark-800 flex items-center border border-slate-300 dark:border-dark-700">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'edit'
                ? 'bg-white dark:bg-dark-900 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'preview'
                ? 'bg-white dark:bg-dark-900 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Letterhead Preview</span>
            </button>
          </div>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>

          {/* Save Button */}
          {!isLocked && (
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl btn-tri-45 font-bold text-xs shadow-md transition disabled:opacity-50 active:scale-95"
            >
              {saveMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{isEdit ? 'Save Changes' : 'Create Quotation'}</span>
            </button>
          )}

          {/* Workflow Status Transitions */}
          {isEdit && currentStatus === 'draft' && (
            <button
              type="button"
              onClick={() => statusMutation.mutate('sent')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Mark Sent</span>
            </button>
          )}

          {isEdit && (currentStatus === 'sent' || currentStatus === 'draft') && (
            <button
              type="button"
              onClick={() => statusMutation.mutate('accepted')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Mark Accepted</span>
            </button>
          )}

          {isEdit && currentStatus === 'accepted' && (
            <button
              type="button"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl btn-green-45 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Convert to Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Executive Quotation Document Canvas (Dark Theme on Screen, Pure White on Print, Full A4 Height) */}
      <div className="printable-document bg-white dark:bg-dark-900 text-slate-900 dark:text-white border border-slate-300 dark:border-dark-700 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[680px] print:min-h-[260mm] print:p-0 print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black max-w-4xl mx-auto space-y-6">

        {/* Top Content: Header, Client Info, Table */}
        <div className="space-y-5">
          {/* Document Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-dark-700 print:border-slate-300">
            {/* Company Brand */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fe7c02] via-[#0062d1] to-[#028825] p-0.5 shadow-sm flex-shrink-0">
                  <div className="w-full h-full bg-white dark:bg-dark-900 print:bg-white rounded-[8px] flex items-center justify-center p-0.5">
                    <img src="/logo.png" alt="Artho Vista" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white print:text-black leading-tight">
                      Artho Vista
                    </h2>
                    <span className="text-[10px] font-black bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 px-1 py-0.2 rounded border border-orange-300 print:hidden">
                      CRM
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#028825] dark:text-emerald-400 print:text-black">
                    सपनों से समृद्धि तक
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-800 font-medium">
                B-Block, Sector 62, Noida, India &bull; contact@arthovista.com &bull; +91 98765 43210
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">
                GSTIN: 07AAAAA0000A1Z5
              </p>
            </div>

            {/* Quotation Title & Ref */}
            <div className="text-right space-y-0.5">
              <h1 className="text-2xl font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 print:text-black">
                QUOTATION
              </h1>
              <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 print:text-black">
                #{resolvedQuotationNo}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-800 pt-1">
                Date: <span className="font-bold text-slate-900 dark:text-white print:text-black">{date}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-800">
                Valid Until: <span className="font-bold text-amber-600 dark:text-amber-400 print:text-amber-800">{validUntil}</span>
              </p>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="pb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-700 mb-1">
              Quotation Prepared For:
            </p>

            {viewMode === 'edit' && !isLocked ? (
              <div className="mb-2">
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full max-w-md px-2.5 py-1.5 rounded border border-slate-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
                >
                  <option value="">-- Select Client / Lead --</option>
                  {(leadsData || []).map((lead: any) => (
                    <option key={lead._id || lead.id} value={lead._id || lead.id}>
                      {lead.name} {lead.company ? `(${lead.company})` : ''} &bull; {lead.phone}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {selectedLead ? (
              <div className="space-y-0.5">
                <p className="font-bold text-base text-slate-900 dark:text-white print:text-black">
                  {selectedLead.name || 'Valued Client'}
                </p>
                {selectedLead.company && (
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-300 print:text-slate-800">
                    {selectedLead.company}
                  </p>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-800">
                  {[selectedLead.phone, selectedLead.email].filter(Boolean).join(' • ')}
                </p>
                {selectedLead.location && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-800">{selectedLead.location}</p>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-700 italic">
                {viewMode === 'edit' ? 'Select a client to automatically populate details.' : 'Direct Client / Walk-in Customer'}
              </div>
            )}
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between no-print">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Services & Line Items
              </h3>
              {viewMode === 'edit' && !isLocked && (
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item Row</span>
                </button>
              )}
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-y-2 border-slate-300 dark:border-dark-700 print:border-slate-900 bg-slate-50/50 dark:bg-dark-800/50 print:bg-white text-xs uppercase font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                  {viewMode === 'edit' && !isLocked && (
                    <>
                      <th className="py-2.5 px-2 w-16 text-center no-print">Disc %</th>
                      <th className="py-2.5 px-2 w-20 text-center no-print">GST %</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  {viewMode === 'edit' && !isLocked && <th className="py-2.5 px-2 w-8 no-print"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-dark-800 print:divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 print:hover:bg-transparent">
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 print:text-black font-medium">{idx + 1}</td>

                    {/* Item Name & Description */}
                    <td className="py-3 px-3 space-y-0.5">
                      {viewMode === 'edit' && !isLocked ? (
                        <>
                          <input
                            type="text"
                            placeholder="Item name / service title..."
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full font-bold px-2 py-1 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs text-slate-900 dark:text-white outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Detailed scope or deliverables..."
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full text-xs text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-800 outline-none"
                          />
                        </>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white print:text-black text-sm">{item.name || 'Service Item'}</p>
                          {item.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 leading-snug mt-0.5">{item.description}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-center">
                      {viewMode === 'edit' && !isLocked ? (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-12 px-1.5 py-0.5 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs text-center font-bold text-slate-900 dark:text-white outline-none"
                        />
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200 print:text-black">{item.quantity}</span>
                      )}
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-3 text-right">
                      {viewMode === 'edit' && !isLocked ? (
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-24 px-1.5 py-0.5 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs text-right font-bold text-slate-900 dark:text-white outline-none"
                        />
                      ) : (
                        <span className="font-mono text-slate-800 dark:text-slate-200 print:text-black">₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>

                    {/* Discount (Edit Mode Only) */}
                    {viewMode === 'edit' && !isLocked && (
                      <td className="py-3 px-2 text-center no-print">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                          className="w-12 px-1 py-0.5 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs text-center font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </td>
                    )}

                    {/* GST Rate (Edit Mode Only) */}
                    {viewMode === 'edit' && !isLocked && (
                      <td className="py-3 px-2 text-center no-print">
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                          className="px-1 py-0.5 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="18">18%</option>
                        </select>
                      </td>
                    )}

                    {/* Line Total */}
                    <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 dark:text-white print:text-black text-sm">
                      ₹{Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Remove Action */}
                    {viewMode === 'edit' && !isLocked && (
                      <td className="py-3 px-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-red-600 p-0.5 transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full-Width Financial / Commercial Summary (Above Bank Settlement Details) */}
          <div className="pt-2 border-t-2 border-slate-300 dark:border-dark-700 print:border-slate-900 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/70 dark:bg-dark-800/50 print:bg-white p-3.5 rounded-xl border border-slate-200 dark:border-dark-700 print:border-y print:border-x-0 print:border-slate-300 print:p-2">
              {/* Amount in Words (Left) */}
              <div className="space-y-1 max-w-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-black">
                  Amount in Words
                </p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white print:text-black italic leading-snug">
                  {numberToWordsINR(grandTotal)}
                </p>
              </div>

              {/* Numerical Breakdown (Right) */}
              <div className="w-full md:w-80 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white print:text-black">
                    ₹{subtotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {totalDiscountSum > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 print:text-emerald-800 font-semibold">
                    <span>Discount Applied:</span>
                    <span className="font-mono">
                      -₹{totalDiscountSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-black">
                  <span>GST (Estimated Tax):</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white print:text-black">
                    ₹{taxTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t-2 border-slate-900 dark:border-dark-600 print:border-black pt-1.5 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white print:text-black">
                  <span>Total Net Payable:</span>
                  <span className="text-base font-mono font-black text-blue-600 dark:text-blue-400 print:text-black">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Bank Details, Terms & Conditions (Full Width) & Authorized Signatory */}
        <div className="space-y-4 print-avoid-break mt-auto pt-4 border-t border-slate-200 dark:border-dark-700 print:border-slate-300">
          {/* Bank Settlement Details (Full Width: 2 Lines) */}
          <div className="space-y-1.5 text-xs w-full">
            <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-dark-700 print:border-slate-300 pb-1">
              Bank Settlement Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              {/* Line 1 */}
              <p className="text-slate-700 dark:text-slate-300 print:text-black">
                Bank Name: <span className="font-bold text-slate-900 dark:text-white print:text-black">HDFC Bank • Artho Vista Pvt Ltd</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300 print:text-black">
                UPI Handle: <span className="font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800">arthovista@okhdfcbank</span>
              </p>
              {/* Line 2 */}
              <p className="text-slate-700 dark:text-slate-300 print:text-black font-mono">
                Account No: <span className="font-bold text-slate-900 dark:text-white print:text-black">50200084729104</span>
              </p>
              <p className="text-slate-700 dark:text-slate-300 print:text-black font-mono">
                IFSC Code: <span className="font-bold text-slate-900 dark:text-white print:text-black">HDFC0001234</span>
              </p>
            </div>
          </div>

          {/* Terms & Conditions (Full Width) & Authorized Signatory Row */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-dark-700 print:border-slate-300">
            {/* Terms & Conditions (Full Width) */}
            <div className="space-y-1 text-xs w-full">
              <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black border-b border-slate-200 dark:border-dark-700 print:border-slate-300 pb-1">
                Terms & Conditions
              </p>
              {viewMode === 'edit' && !isLocked ? (
                <textarea
                  rows={2}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs text-slate-900 dark:text-white outline-none font-medium"
                />
              ) : (
                <div className="text-slate-600 dark:text-slate-300 print:text-black whitespace-pre-line leading-relaxed text-xs">
                  {termsAndConditions}
                </div>
              )}
              {notes && (
                <p className="text-slate-500 dark:text-slate-400 print:text-black italic pt-0.5 text-xs">
                  Note: {notes}
                </p>
              )}
            </div>

            {/* Authorized Signatory Block (Bottom-Right Pinned) */}
            <div className="flex justify-end items-end pt-2">
              <div className="text-right space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white print:text-black">
                  ArthoVista Pvt. Ltd.
                </p>
                <div className="w-56 ml-auto pt-8 text-center">
                  <div className="border-b-2 border-slate-900 dark:border-slate-400 print:border-black mb-1.5 w-full"></div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                    AUTHORIZED SIGNATORY
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
