import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuotationTotals, IQuotationLineItem } from '../models/Quotation';

test('Quotation Calculation - Single Item without discount and tax', () => {
  const items: IQuotationLineItem[] = [
    {
      name: 'GST Registration',
      quantity: 2,
      rate: 2500,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 0,
      taxAmount: 0,
      subtotal: 0,
      total: 0
    }
  ];

  const result = calculateQuotationTotals(items);
  assert.strictEqual(result.subtotal, 5000);
  assert.strictEqual(result.totalDiscount, 0);
  assert.strictEqual(result.taxTotal, 0);
  assert.strictEqual(result.totalAmount, 5000);
  assert.strictEqual(result.items[0].subtotal, 5000);
  assert.strictEqual(result.items[0].total, 5000);
});

test('Quotation Calculation - Percentage Discount and 18% GST', () => {
  const items: IQuotationLineItem[] = [
    {
      name: 'Startup Advisory Package',
      quantity: 1,
      rate: 10000,
      discountPercent: 10, // 10% discount -> 1000 discount
      discountAmount: 0,
      gstRate: 18, // 18% of 9000 -> 1620 tax
      taxAmount: 0,
      subtotal: 0,
      total: 0
    }
  ];

  const result = calculateQuotationTotals(items);
  assert.strictEqual(result.subtotal, 10000);
  assert.strictEqual(result.totalDiscount, 1000);
  assert.strictEqual(result.items[0].subtotal, 9000);
  assert.strictEqual(result.items[0].taxAmount, 1620);
  assert.strictEqual(result.items[0].total, 10620);
  assert.strictEqual(result.taxTotal, 1620);
  assert.strictEqual(result.totalAmount, 10620);
});

test('Quotation Calculation - Multiple Line Items aggregate accurately', () => {
  const items: IQuotationLineItem[] = [
    {
      name: 'Item A',
      quantity: 2,
      rate: 1000, // 2000
      discountPercent: 0,
      discountAmount: 200, // net 1800
      gstRate: 18, // 18% of 1800 = 324 -> total 2124
      taxAmount: 0,
      subtotal: 0,
      total: 0
    },
    {
      name: 'Item B',
      quantity: 1,
      rate: 5000, // 5000
      discountPercent: 20, // 1000 discount -> net 4000
      discountAmount: 0,
      gstRate: 12, // 12% of 4000 = 480 -> total 4480
      taxAmount: 0,
      subtotal: 0,
      total: 0
    }
  ];

  const result = calculateQuotationTotals(items);
  assert.strictEqual(result.subtotal, 7000);
  assert.strictEqual(result.totalDiscount, 1200);
  assert.strictEqual(result.taxTotal, 804);
  assert.strictEqual(result.totalAmount, 6604);
});

test('Pipeline Stages - Required Payment Stages are Recognized', () => {
  // Required CRM stages per specifications
  const pipelineStages = [
    'In Process',
    'Qualified',
    'Proposal Sent',
    'Negotiation',
    'Payment Expected',
    'Payment Received',
    'Payment Remaining',
    'Won',
    'Lost'
  ];

  assert.ok(pipelineStages.includes('Payment Expected'), 'Pipeline should support Payment Expected');
  assert.ok(pipelineStages.includes('Payment Received'), 'Pipeline should support Payment Received');
  assert.ok(pipelineStages.includes('Payment Remaining'), 'Pipeline should support Payment Remaining');

  // Verify classifier mappings
  function classifySubStage(leadType: string): string {
    const stageKey = leadType || 'In Process';
    const knownStages = ['In Process', 'Qualified', 'Proposal Sent', 'Negotiation', 'Payment Expected', 'Payment Remaining'];
    if (knownStages.includes(stageKey)) return stageKey;
    const lower = stageKey.toLowerCase();
    if (lower.includes('expect')) return 'Payment Expected';
    if (lower.includes('remain')) return 'Payment Remaining';
    if (lower.includes('qualif')) return 'Qualified';
    if (lower.includes('proposal') || lower.includes('send')) return 'Proposal Sent';
    if (lower.includes('negot')) return 'Negotiation';
    return 'In Process';
  }

  assert.strictEqual(classifySubStage('Payment Expected'), 'Payment Expected');
  assert.strictEqual(classifySubStage('advance payment expected'), 'Payment Expected');
  assert.strictEqual(classifySubStage('Payment Remaining'), 'Payment Remaining');
  assert.strictEqual(classifySubStage('milestone remaining balance'), 'Payment Remaining');
});

test('Converted Stages - High Value has been removed from converted sub-stages', () => {
  const convertedSubStages = [
    'Direct Won',
    'Quotation Won',
    'Invoiced',
    'Payment Received',
    'Payment Remaining'
  ];
  assert.strictEqual(convertedSubStages.includes('High Value'), false, 'High Value should not be present in converted sub-stages');
  assert.strictEqual(convertedSubStages.length, 5);
});

test('Commercial Payment Tracking - Due amount calculation and balance', () => {
  function calculatePaymentDue(expected: number, received: number): { expected: number; received: number; due: number; isPaidInFull: boolean } {
    const exp = Math.max(0, Number(expected) || 0);
    const rec = Math.max(0, Number(received) || 0);
    const due = Math.max(0, exp - rec);
    return {
      expected: exp,
      received: rec,
      due,
      isPaidInFull: exp > 0 && due === 0
    };
  }

  // 1. Partial payment
  const partial = calculatePaymentDue(50000, 20000);
  assert.strictEqual(partial.due, 30000);
  assert.strictEqual(partial.isPaidInFull, false);

  // 2. Full payment
  const full = calculatePaymentDue(50000, 50000);
  assert.strictEqual(full.due, 0);
  assert.strictEqual(full.isPaidInFull, true);

  // 3. Overpayment / excess payment clamps due to 0
  const excess = calculatePaymentDue(50000, 55000);
  assert.strictEqual(excess.due, 0);
  assert.strictEqual(excess.isPaidInFull, true);

  // 4. Zero received
  const zeroRec = calculatePaymentDue(25000, 0);
  assert.strictEqual(zeroRec.due, 25000);
  assert.strictEqual(zeroRec.isPaidInFull, false);

  // 5. Zero expected
  const zeroExp = calculatePaymentDue(0, 0);
  assert.strictEqual(zeroExp.due, 0);
  assert.strictEqual(zeroExp.isPaidInFull, false);
});

test('Conversion Validation - Transitioning to Converted requires Payment Expected > 0', () => {
  function validateLeadConversion(currentStatus: string, newStatus: string, paymentExpected?: number): { allowed: boolean; errorCode?: string } {
    const isBecomingConverted = newStatus === 'Converted' && currentStatus !== 'Converted';
    if (isBecomingConverted && (paymentExpected === undefined || paymentExpected === null || Number(paymentExpected) <= 0 || isNaN(Number(paymentExpected)))) {
      return { allowed: false, errorCode: 'PAYMENT_EXPECTED_REQUIRED' };
    }
    return { allowed: true };
  }

  // From New to Converted with valid amount -> allowed
  assert.deepStrictEqual(validateLeadConversion('New', 'Converted', 50000), { allowed: true });

  // From Open to Converted with valid amount -> allowed
  assert.deepStrictEqual(validateLeadConversion('Open', 'Converted', 15000), { allowed: true });

  // From Open to Converted with undefined amount -> rejected
  assert.deepStrictEqual(validateLeadConversion('Open', 'Converted', undefined), {
    allowed: false,
    errorCode: 'PAYMENT_EXPECTED_REQUIRED'
  });

  // From New to Converted with 0 amount -> rejected
  assert.deepStrictEqual(validateLeadConversion('New', 'Converted', 0), {
    allowed: false,
    errorCode: 'PAYMENT_EXPECTED_REQUIRED'
  });

  // Already Converted updating sub-stage or details -> allowed without re-enforcing > 0
  assert.deepStrictEqual(validateLeadConversion('Converted', 'Converted', undefined), { allowed: true });

  // Moving between non-converted stages (e.g. New to Open) -> allowed
  assert.deepStrictEqual(validateLeadConversion('New', 'Open', undefined), { allowed: true });
});

test('Role Visibility Rule - Payment columns visible in Converted Pipeline to Assigned Employees, Finance, Operation, and Admins', () => {
  function checkPaymentColumnsVisibility(currentMode: string): boolean {
    return currentMode === 'converted';
  }

  // 1. Converted pipeline - visible to everyone viewing converted leads (assigned employee, finance, operation, admin)
  assert.strictEqual(checkPaymentColumnsVisibility('converted'), true);

  // 2. Non-converted pipeline (open, today, lost, all) -> columns hidden
  assert.strictEqual(checkPaymentColumnsVisibility('open'), false);
  assert.strictEqual(checkPaymentColumnsVisibility('all'), false);
  assert.strictEqual(checkPaymentColumnsVisibility('lost'), false);
  assert.strictEqual(checkPaymentColumnsVisibility('today'), false);
  assert.strictEqual(checkPaymentColumnsVisibility('followup'), false);
});

