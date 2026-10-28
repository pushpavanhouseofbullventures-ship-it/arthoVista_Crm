import test from 'node:test';
import assert from 'node:assert/strict';
import { getWatermarkStatusInfo } from '../utils/watermark.ts';

test('Watermark Logic - Quotation Draft Status', () => {
  const info = getWatermarkStatusInfo('draft', 'quotation');
  assert.ok(info !== null, 'Status info should not be null');
  assert.strictEqual(info?.text, 'DRAFT PROPOSAL');
  assert.strictEqual(info?.stampClass, 'watermark-stamp-draft');
});

test('Watermark Logic - Invoice Draft Status', () => {
  const info = getWatermarkStatusInfo('draft', 'invoice');
  assert.ok(info !== null);
  assert.strictEqual(info?.text, 'DRAFT INVOICE');
  assert.strictEqual(info?.stampClass, 'watermark-stamp-draft');
});

test('Watermark Logic - Paid Status', () => {
  const info = getWatermarkStatusInfo('paid', 'invoice');
  assert.ok(info !== null);
  assert.strictEqual(info?.text, 'PAID IN FULL');
  assert.strictEqual(info?.stampClass, 'watermark-stamp-paid');
});

test('Watermark Logic - Partially Paid Status', () => {
  const info = getWatermarkStatusInfo('partially_paid', 'invoice');
  assert.ok(info !== null);
  assert.strictEqual(info?.text, 'PARTIALLY PAID');
});

test('Watermark Logic - Accepted & Won Statuses', () => {
  const accepted = getWatermarkStatusInfo('accepted', 'quotation');
  const won = getWatermarkStatusInfo('won', 'quotation');
  assert.strictEqual(accepted?.text, 'ACCEPTED & APPROVED');
  assert.strictEqual(won?.text, 'ACCEPTED & APPROVED');
  assert.strictEqual(accepted?.stampClass, 'watermark-stamp-accepted');
});

test('Watermark Logic - Void & Cancelled Statuses', () => {
  const voided = getWatermarkStatusInfo('void', 'invoice');
  const cancelled = getWatermarkStatusInfo('cancelled', 'invoice');
  assert.strictEqual(voided?.text, 'VOID / CANCELLED');
  assert.strictEqual(cancelled?.text, 'VOID / CANCELLED');
  assert.strictEqual(voided?.stampClass, 'watermark-stamp-void');
});

test('Watermark Logic - Sent Status', () => {
  const sent = getWatermarkStatusInfo('sent', 'quotation');
  assert.strictEqual(sent?.text, 'ISSUED & SENT');
});

test('Watermark Logic - Case Insensitivity and Trimming', () => {
  const upper = getWatermarkStatusInfo('  PAID  ');
  assert.strictEqual(upper?.text, 'PAID IN FULL');

  const mixed = getWatermarkStatusInfo('  DrAFt  ', 'quotation');
  assert.strictEqual(mixed?.text, 'DRAFT PROPOSAL');
});

test('Watermark Logic - Invalid or Empty Statuses return null', () => {
  assert.strictEqual(getWatermarkStatusInfo(undefined), null);
  assert.strictEqual(getWatermarkStatusInfo(''), null);
  assert.strictEqual(getWatermarkStatusInfo('custom_stage_xyz'), null);
});
