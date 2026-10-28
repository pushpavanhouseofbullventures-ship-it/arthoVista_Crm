import React, { useState, useEffect, useRef } from 'react';
import {
  X, Bug, Upload, CheckCircle2,
  Monitor, Link as LinkIcon, Info, Loader2, AlertCircle, Trash2
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newIssue?: any) => void;
  defaultModule?: string;
}

const MODULES = [
  { id: 'lead_management', label: 'Lead Management' },
  { id: 'mobile_sync', label: 'Mobile SIM Sync & Calls' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'invoices', label: 'Invoices & Billing' },
  { id: 'ot_pipeline', label: 'OT Pipeline & Loan Scheme' },
  { id: 'hr', label: 'HR Calling' },
  { id: 'dashboard', label: 'Dashboard & Reports' },
  { id: 'auth', label: 'Login & Permissions' },
  { id: 'general', label: 'Other / General CRM' },
];

const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug / Software Error' },
  { id: 'ui_glitch', label: '🎨 UI / Display Glitch' },
  { id: 'data_mismatch', label: '📊 Data / Calculation Mismatch' },
  { id: 'sim_sync', label: '📱 SIM Sync / Call Log Failure' },
  { id: 'slow_performance', label: '⚡ Slow Page / Freezing' },
  { id: 'feature_request', label: '💡 Feature Request / Improvement' },
  { id: 'other', label: '❓ Other Issue' },
];

const SEVERITIES = [
  { id: 'low', label: 'Low', desc: 'Minor visual glitch or typo', color: 'border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40' },
  { id: 'medium', label: 'Medium', desc: 'Feature problem with workaround', color: 'border-amber-500/40 text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40' },
  { id: 'high', label: 'High', desc: 'Core feature broken / work blocked', color: 'border-orange-500/40 text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-950/40' },
  { id: 'critical', label: 'Critical', desc: 'Crash, data loss, system down', color: 'border-rose-500/50 text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40 animate-pulse' },
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultModule
}) => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState(defaultModule || 'general');
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('medium');
  const [pageUrl, setPageUrl] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [browserInfo, setBrowserInfo] = useState('');

  // Screenshot upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-detect URL and browser info when opened
  useEffect(() => {
    if (isOpen) {
      setPageUrl(window.location.pathname + window.location.search);
      const userAgent = navigator.userAgent;
      let browserName = 'Browser';
      if (userAgent.includes('Firefox')) browserName = 'Firefox';
      else if (userAgent.includes('Edg')) browserName = 'Edge';
      else if (userAgent.includes('Chrome')) browserName = 'Chrome';
      else if (userAgent.includes('Safari')) browserName = 'Safari';

      let osName = 'OS';
      if (userAgent.includes('Windows')) osName = 'Windows';
      else if (userAgent.includes('Macintosh')) osName = 'MacOS';
      else if (userAgent.includes('Android')) osName = 'Android';
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) osName = 'iOS';
      else if (userAgent.includes('Linux')) osName = 'Linux';

      setBrowserInfo(`${browserName} on ${osName} (${window.innerWidth}x${window.innerHeight})`);
      setSubmittedIssue(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Support Ctrl+V / Paste image from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size cannot exceed 10MB.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an issue summary / title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe what happened.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedScreenshotUrl: string | null = null;

      // 1. Upload screenshot if selected
      if (selectedFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('screenshot', selectedFile);

        const uploadRes = await api.post('/issues/upload-screenshot', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data?.data?.url) {
          uploadedScreenshotUrl = uploadRes.data.data.url;
        }
        setIsUploadingImage(false);
      }

      // 2. Submit Issue Report
      const payload = {
        title: title.trim(),
        description: description.trim(),
        module,
        category,
        severity,
        pageUrl,
        browserInfo,
        screenshotUrl: uploadedScreenshotUrl,
        stepsToReproduce: stepsToReproduce.trim() || undefined
      };

      const res = await api.post('/issues', payload);

      if (res.data?.success) {
        const created = res.data.data;
        setSubmittedIssue(created);
        if (onSuccess) {
          onSuccess(created);
        }
      }
    } catch (err: any) {
      console.error('Failed to submit issue report:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit issue report. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const resetFormAndClose = () => {
    setTitle('');
    setDescription('');
    setStepsToReproduce('');
    handleRemoveImage();
    setSubmittedIssue(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/20 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-md flex items-center justify-center text-white">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Report a CRM Issue / Bug
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  Direct Report
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Facing an issue in the CRM? Submit it here and our tech team will resolve it.
              </p>
            </div>
          </div>
          <button
            onClick={resetFormAndClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {submittedIssue ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Issue Report Created Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Your issue has been assigned ticket code{' '}
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 dark:border-orange-800">
                    {submittedIssue.issueId}
                  </span>
                  . The admin & engineering team have been notified.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 max-w-md mx-auto text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Summary:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                    {submittedIssue.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Module:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {MODULES.find(m => m.id === submittedIssue.module)?.label || submittedIssue.module}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Severity:</span>
                  <span className="font-bold uppercase tracking-wider text-orange-600">
                    {submittedIssue.severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">
                    {submittedIssue.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={resetFormAndClose}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedIssue(null);
                    setTitle('');
                    setDescription('');
                    setStepsToReproduce('');
                    handleRemoveImage();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 font-bold text-xs transition"
                >
                  Report Another Issue
                </button>
              </div>
            </div>
          ) : (
            /* Issue Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Module & Category Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Affected CRM Module <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                  >
                    {MODULES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Severity / Urgency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITIES.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSeverity(s.id)}
                      className={`p-2 rounded-xl text-left border transition ${
                        severity === s.id
                          ? `${s.color} ring-2 ring-orange-500/40 shadow-sm font-black`
                          : 'border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold">{s.label}</span>
                        {severity === s.id && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>
                      <p className="text-[10px] opacity-80 mt-0.5 leading-tight truncate">
                        {s.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Summary / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., SIM call logs not updating or quotation discount button fails"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / What went wrong? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please describe what you were trying to do, what happened, and any error message displayed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium resize-none"
                />
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Steps to Reproduce (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="1. Go to Quotations page&#10;2. Click on 'New Quotation'&#10;3. Select client and click Save"
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium resize-none"
                />
              </div>

              {/* Screenshot / File Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attach Screenshot / Proof (Supports Paste <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-dark-800 border text-[10px]">Ctrl+V</kbd>)
                </label>

                {previewUrl ? (
                  <div className="relative rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 p-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Screenshot preview"
                        className="h-16 w-24 object-cover rounded-xl border border-slate-300 dark:border-dark-700 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {selectedFile?.name || 'Pasted Screenshot.png'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Image ready for upload'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition mr-2"
                      title="Remove screenshot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-dark-700 hover:border-orange-400 dark:hover:border-orange-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 dark:bg-dark-800/30 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                        <Upload className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Click to upload or drag screenshot here
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Tip: You can also take a screenshot (<kbd>Win+Shift+S</kbd>) and press <kbd>Ctrl+V</kbd> anywhere!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-Captured Context Box */}
              <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-dark-800/50 border border-slate-200 dark:border-dark-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <span>Auto-Captured Diagnostics</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[10px]">
                  <div className="flex items-center space-x-1.5 truncate">
                    <LinkIcon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400">URL:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{pageUrl}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 truncate">
                    <Monitor className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400">System:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{browserInfo}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 truncate sm:col-span-2">
                    <span className="text-slate-400">Reporter:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {user?.firstName} {user?.lastName} ({user?.email})
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={resetFormAndClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 active:scale-95 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting || isUploadingImage ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{isUploadingImage ? 'Uploading Image...' : 'Submitting Issue...'}</span>
                    </>
                  ) : (
                    <>
                      <Bug className="h-3.5 w-3.5" />
                      <span>Create Issue Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
