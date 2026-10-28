import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Plus, Trash2, ArrowLeft, CheckCircle2,
  Send, Printer, RefreshCw, Eye, Edit3,
  Check
} from 'lucide-react';
import { DocumentWatermark } from '../../components/DocumentWatermark';

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
  const [customClientCompany, setCustomClientCompany] = useState<string>('ABC Technologies Pvt. Ltd.');
  const [customContactName, setCustomContactName] = useState<string>('Rahul Sharma');
  const [customLocation, setCustomLocation] = useState<string>('Noida, Uttar Pradesh');
  const [introNote, setIntroNote] = useState<string>(
    'Thank you for considering Artho Vista. Please find our proposed services and commercial details below.'
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    '50% advance; remaining 50% on completion of agreed deliverables.'
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<LineItem[]>([
    {
      name: 'DPIIT Startup Recognition',
      description: 'Application and documentation assistance',
      quantity: 1,
      rate: 8000,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 18,
      taxAmount: 1440,
      subtotal: 8000,
      total: 8000
    },
    {
      name: 'MSME Registration Assistance',
      description: 'Udyam registration support',
      quantity: 1,
      rate: 2000,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 18,
      taxAmount: 360,
      subtotal: 2000,
      total: 2000
    },
    {
      name: 'Business Advisory',
      description: 'Initial consulting package',
      quantity: 1,
      rate: 5000,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 18,
      taxAmount: 900,
      subtotal: 5000,
      total: 5000
    }
  ]);
  const [notes, setNotes] = useState('Thank you for considering our services. We look forward to a successful and long-term partnership.');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Government fees, if applicable, are charged separately unless specified.\n2. Timelines depend on document submission and authority processing.\n3. Service starts upon acceptance and agreed payment.'
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
      if (existingQuotation.notes) {
        try {
          const parsed = JSON.parse(existingQuotation.notes);
          if (parsed && typeof parsed === 'object') {
            if (parsed.introNote) setIntroNote(parsed.introNote);
            if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
            if (parsed.customClientCompany) setCustomClientCompany(parsed.customClientCompany);
            if (parsed.customContactName) setCustomContactName(parsed.customContactName);
            if (parsed.customLocation) setCustomLocation(parsed.customLocation);
            if (parsed.generalNote) setNotes(parsed.generalNote);
          } else {
            setNotes(existingQuotation.notes);
          }
        } catch {
          setNotes(existingQuotation.notes);
        }
      }
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
    (existingQuotation?.id ? `AV-QT-${existingQuotation.id.substring(0, 8).toUpperCase()}` : 'AV-QT-2026-001');

  // Format date helper (e.g. 21 Oct 2026)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Resolved Client Presentation
  const clientCompany = selectedLead?.company || customClientCompany || selectedLead?.name || 'ABC Technologies Pvt. Ltd.';
  const clientContact = selectedLead?.name ? `Contact: ${selectedLead.name}` : (customContactName ? `Contact: ${customContactName}` : 'Contact: Rahul Sharma');
  const clientLocation = selectedLead?.location || customLocation || 'Noida, Uttar Pradesh';

  // Dynamic UPI Payment QR Link
  const upiIntentUri = `upi://pay?pa=arthovista@okhdfcbank&pn=Artho%20Vista&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(resolvedQuotationNo)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiIntentUri)}`;

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leadId: leadId || undefined,
        customerId: customerId || undefined,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items,
        notes: JSON.stringify({
          introNote,
          paymentTerms,
          customClientCompany,
          customContactName,
          customLocation,
          generalNote: notes
        }),
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

      {/* 2. Main Executive Quotation Document Canvas (Exact Artho Vista Official Layout) */}
      <div className="printable-document bg-white text-slate-900 border border-slate-300 dark:border-dark-700 rounded-2xl shadow-xl max-w-4xl mx-auto overflow-hidden print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-full print:w-full">

        {/* 1. Header Banner (Deep Navy Background #0f1d36) */}
        <div
          className="bg-[#0f1d36] text-white px-8 py-7 sm:px-10 sm:py-8 flex items-center justify-between"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white font-sans">
              ArthoVista
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-slate-300 uppercase mt-1">
              BUSINESS GROWTH MADE SIMPLE
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase font-sans">
              QUOTATION
            </h2>
            <p className="text-xs font-mono font-medium text-slate-300 mt-1 tracking-wide">
              # {resolvedQuotationNo}
            </p>
          </div>
        </div>

        {/* 2. Document Body */}
        <div className="p-8 sm:p-10 bg-white text-slate-900 relative overflow-hidden">
          {/* Executive Security & Brand Watermark */}
          <DocumentWatermark
            brandText="ARTHOVISTA"
            subText="BUSINESS GROWTH MADE SIMPLE"
            documentType="quotation"
            status={currentStatus}
          />

          <div className="relative z-10 space-y-6">
            {/* Quotation To & Dates Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                  QUOTATION TO
                </p>

                {/* Edit Mode Custom Input Fields */}
                {viewMode === 'edit' && !isLocked && (
                  <div className="space-y-2 max-w-sm pt-1 pb-2 no-print">
                    <select
                      value={leadId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLeadId(val);
                        const lead = (leadsData || []).find((l: any) => (l._id || l.id) === val);
                        if (lead) {
                          setCustomClientCompany(lead.company || lead.name || '');
                          setCustomContactName(lead.name || '');
                          setCustomLocation(lead.location || lead.city || 'Noida, Uttar Pradesh');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="" className="text-slate-500 bg-white">-- Link CRM Lead (Optional) --</option>
                      {(leadsData || []).map((lead: any) => (
                        <option key={lead._id || lead.id} value={lead._id || lead.id} className="text-slate-900 bg-white">
                          {lead.name} {lead.company ? `(${lead.company})` : ''} • {lead.phone}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Company Name (e.g. ABC Technologies Pvt. Ltd.)"
                      value={customClientCompany}
                      onChange={(e) => setCustomClientCompany(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                      type="text"
                      placeholder="Contact Person (e.g. Rahul Sharma)"
                      value={customContactName}
                      onChange={(e) => setCustomContactName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Noida, Uttar Pradesh)"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                {/* Rendered Client Details */}
                <div>
                  <p className="text-base font-bold text-slate-950">
                    {clientCompany}
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {clientContact}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {clientLocation}
                  </p>
                </div>
              </div>

              <div className="sm:text-right space-y-0.5">
                <p className="text-xs text-slate-600">
                  Date: <span className="font-semibold text-slate-900">{formatDateDisplay(date)}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Valid Until: <span className="font-semibold text-slate-900">{formatDateDisplay(validUntil)}</span>
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#ebf8ee] text-[#1e7e34] border border-[#c3e6cb]">
                    {currentStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Service Quotation Intro */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-slate-900">Service Quotation</h3>
              {viewMode === 'edit' && !isLocked ? (
                <textarea
                  rows={2}
                  value={introNote}
                  onChange={(e) => setIntroNote(e.target.value)}
                  className="w-full p-2 mt-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 no-print"
                />
              ) : null}
              <p className="text-xs text-slate-700 leading-relaxed mt-0.5">
                {introNote}
              </p>
            </div>

            {/* 4. Line Items Table */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-1 no-print">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Services & Commercial Details</span>
                {viewMode === 'edit' && !isLocked && (
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs hover:bg-blue-100 transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Service Row</span>
                  </button>
                )}
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 text-[10px] uppercase font-bold text-slate-700 tracking-wider">
                    <th className="py-2.5 px-2 text-left">SERVICE DESCRIPTION</th>
                    <th className="py-2.5 px-2 w-16 text-center">QTY</th>
                    <th className="py-2.5 px-2 w-28 text-right">RATE</th>
                    {viewMode === 'edit' && !isLocked && (
                      <>
                        <th className="py-2.5 px-2 w-16 text-center no-print">DISC %</th>
                        <th className="py-2.5 px-2 w-16 text-center no-print">GST %</th>
                      </>
                    )}
                    <th className="py-2.5 px-2 w-28 text-right">AMOUNT</th>
                    {viewMode === 'edit' && !isLocked && <th className="py-2.5 px-2 w-8 no-print"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2 space-y-0.5">
                        {viewMode === 'edit' && !isLocked ? (
                          <>
                            <input
                              type="text"
                              placeholder="Service title..."
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full font-bold px-2 py-1 rounded border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Description / deliverables..."
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full text-xs text-slate-700 px-2 py-0.5 rounded border border-slate-200 bg-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{item.name || 'Service Item'}</p>
                            {item.description && (
                              <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{item.description}</p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        {viewMode === 'edit' && !isLocked ? (
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white text-xs text-center font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{item.quantity}</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        {viewMode === 'edit' && !isLocked ? (
                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            className="w-24 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 font-mono">
                            Rs. {Number(item.rate || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {viewMode === 'edit' && !isLocked && (
                        <>
                          <td className="py-3 px-2 text-center no-print">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white text-xs text-center font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-2 text-center no-print">
                            <select
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                              className="px-1 py-0.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="0" className="text-slate-900 bg-white">0%</option>
                              <option value="18" className="text-slate-900 bg-white">18%</option>
                            </select>
                          </td>
                        </>
                      )}

                      <td className="py-3 px-2 text-right">
                        <span className="font-bold text-slate-800 font-mono">
                          Rs. {Number(item.subtotal !== undefined ? item.subtotal : (item.rate * item.quantity || 0)).toLocaleString('en-IN')}
                        </span>
                      </td>

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

            {/* 5. Subtotal, GST & Grand Total */}
            <div className="flex flex-col items-end pt-3 space-y-1">
              <div className="flex justify-between w-64 text-xs text-slate-600 py-0.5">
                <span>Subtotal</span>
                <span className="font-medium font-mono text-slate-800">
                  Rs. {subtotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between w-64 text-xs text-slate-600 py-0.5">
                <span>GST (18% illustrative)</span>
                <span className="font-medium font-mono text-slate-800">
                  Rs. {taxTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div
                className="bg-[#edf2f7] rounded-lg px-4 py-2.5 flex justify-between items-center w-72 mt-2"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">GRAND TOTAL</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  Rs. {grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* 6. Payment Details & QR Code */}
            <div className="flex justify-between items-start pt-6 gap-6">
              <div className="space-y-1.5 max-w-sm">
                <p className="text-xs font-black uppercase tracking-wider text-slate-900">PAYMENT DETAILS</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Scan the QR code to make payment.<br />
                  Please mention the quotation number<br />
                  in the payment reference.
                </p>
              </div>
              <div className="text-center shrink-0">
                <div className="w-24 h-24 p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs mx-auto flex items-center justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="Scan & Pay QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-700 block mt-1">
                  SCAN & PAY
                </span>
              </div>
            </div>

            {/* 7. Payment Terms & Terms and Conditions */}
            <div className="space-y-3 pt-4">
              <div>
                <p className="text-xs font-bold text-slate-900 mb-0.5">Payment Terms</p>
                {viewMode === 'edit' && !isLocked ? (
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                ) : (
                  <p className="text-xs text-slate-700">{paymentTerms}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-900 mb-0.5">Terms & Conditions</p>
                {viewMode === 'edit' && !isLocked ? (
                  <textarea
                    rows={3}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                ) : (
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {termsAndConditions}
                  </div>
                )}
              </div>
            </div>

            {/* 8. Footer */}
            <div className="pt-6 mt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>ARTHO VISTA | www.arthovista.com | connect@arthovista.com</span>
              <span>
                <h3>{selectedLead?.name}</h3>
                <h3>Authorized Signatory</h3>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
