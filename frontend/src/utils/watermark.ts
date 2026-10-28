export type DocumentWatermarkType = 'quotation' | 'invoice';

export interface WatermarkStatusInfo {
  text: string;
  sub: string;
  borderClass: string;
  textClass: string;
  stampClass: string;
}

/**
 * Returns visual stamp metadata for official document watermarks.
 * @param status Status of quotation (draft, sent, accepted, won, void, etc.) or invoice (draft, paid, partially_paid, sent, void)
 * @param documentType 'quotation' | 'invoice'
 */
export function getWatermarkStatusInfo(
  status?: string,
  documentType: DocumentWatermarkType = 'quotation'
): WatermarkStatusInfo | null {
  const s = (status || '').trim().toLowerCase();

  if (s === 'draft') {
    return {
      text: documentType === 'invoice' ? 'DRAFT INVOICE' : 'DRAFT PROPOSAL',
      sub: 'CONFIDENTIAL • NOT FINAL',
      borderClass: 'border-amber-500/20 dark:border-amber-400/20',
      textClass: 'text-amber-600/20 dark:text-amber-400/20',
      stampClass: 'watermark-stamp-draft'
    };
  }

  if (s === 'paid') {
    return {
      text: 'PAID IN FULL',
      sub: 'OFFICIAL RECEIPT CONFIRMED',
      borderClass: 'border-emerald-600/25 dark:border-emerald-400/25',
      textClass: 'text-emerald-700/25 dark:text-emerald-400/25',
      stampClass: 'watermark-stamp-paid'
    };
  }

  if (s === 'partially_paid' || s === 'partial') {
    return {
      text: 'PARTIALLY PAID',
      sub: 'PARTIAL SETTLEMENT RECEIVED',
      borderClass: 'border-amber-600/25 dark:border-amber-400/25',
      textClass: 'text-amber-700/25 dark:text-amber-400/25',
      stampClass: 'watermark-stamp-partial'
    };
  }

  if (s === 'accepted' || s === 'won') {
    return {
      text: 'ACCEPTED & APPROVED',
      sub: 'COMMERCIALLY CONFIRMED',
      borderClass: 'border-emerald-600/25 dark:border-emerald-400/25',
      textClass: 'text-emerald-700/25 dark:text-emerald-400/25',
      stampClass: 'watermark-stamp-accepted'
    };
  }

  if (s === 'void' || s === 'cancelled') {
    return {
      text: 'VOID / CANCELLED',
      sub: 'INVALIDATED DOCUMENT',
      borderClass: 'border-rose-600/25 dark:border-rose-400/25',
      textClass: 'text-rose-700/25 dark:text-rose-400/25',
      stampClass: 'watermark-stamp-void'
    };
  }

  if (s === 'sent') {
    return {
      text: 'ISSUED & SENT',
      sub: 'OFFICIAL DISPATCH',
      borderClass: 'border-blue-500/25 dark:border-blue-400/25',
      textClass: 'text-blue-600/30 dark:text-blue-400/30',
      stampClass: 'watermark-stamp-sent'
    };
  }

  return null;
}
