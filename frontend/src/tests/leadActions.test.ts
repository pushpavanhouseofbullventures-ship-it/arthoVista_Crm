import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validator functions reflecting the frontend & backend rules
export const PHONE_REGEX = /^[0-9+\-\s()]{10,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadInput(input: {
  name?: string;
  phone?: string;
  email?: string;
}) {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push('Lead name is required.');
  }

  const cleanPhone = (input.phone || '').replace(/[^0-9]/g, '');
  if (!input.phone || cleanPhone.length < 10) {
    errors.push('A valid phone number (at least 10 digits) is required.');
  }

  if (input.email && input.email.trim() && !EMAIL_REGEX.test(input.email.trim())) {
    errors.push('Invalid email address format.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanPhone: cleanPhone.slice(-10)
  };
}

export function isUserPrivilegedForLeadCreation(role?: string, email?: string): boolean {
  const adminEmails = ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'];
  if (email && adminEmails.includes(email.toLowerCase().trim())) {
    return true;
  }
  const normalizedRole = (role || '').trim();
  return ['Admin', 'Super Admin', 'Manager'].includes(normalizedRole);
}

export function shouldOpenLeadModalFromQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('action') === 'new' || params.get('new') === 'true';
}

// Unit Tests
test('Lead Input Validation - Valid lead passes all checks', () => {
  const result = validateLeadInput({
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul@example.com'
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.cleanPhone, '9876543210');
});

test('Lead Input Validation - Requires lead name', () => {
  const result = validateLeadInput({
    name: '   ',
    phone: '9876543210'
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.includes('Lead name is required.'));
});

test('Lead Input Validation - Rejects phone numbers under 10 digits', () => {
  const result = validateLeadInput({
    name: 'Pooja',
    phone: '98765'
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('at least 10 digits')));
});

test('Lead Input Validation - Cleans formatted phone numbers (+91, dashes, spaces)', () => {
  const result = validateLeadInput({
    name: 'Amit Kumar',
    phone: '+91 98765-43210'
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.cleanPhone, '9876543210');
});

test('Lead Input Validation - Validates email format if provided', () => {
  const invalidEmail = validateLeadInput({
    name: 'Vikram',
    phone: '9876543210',
    email: 'invalid-email-address'
  });
  assert.strictEqual(invalidEmail.isValid, false);
  assert.ok(invalidEmail.errors.some(e => e.includes('Invalid email')));

  const optionalEmptyEmail = validateLeadInput({
    name: 'Vikram',
    phone: '9876543210',
    email: ''
  });
  assert.strictEqual(optionalEmptyEmail.isValid, true);
});

test('Lead Permission Logic - Admins and Managers are privileged to create leads', () => {
  assert.strictEqual(isUserPrivilegedForLeadCreation('Admin'), true);
  assert.strictEqual(isUserPrivilegedForLeadCreation('Super Admin'), true);
  assert.strictEqual(isUserPrivilegedForLeadCreation('Manager'), true);
  assert.strictEqual(isUserPrivilegedForLeadCreation('Sale Executive'), false);
  assert.strictEqual(isUserPrivilegedForLeadCreation('Employee'), false);
});

test('Lead Permission Logic - Special admin emails are always privileged', () => {
  assert.strictEqual(isUserPrivilegedForLeadCreation('Sale Executive', 'shivam.arthaventures@gmail.com'), true);
  assert.strictEqual(isUserPrivilegedForLeadCreation(undefined, 'shivamthakur12012@gmail.com'), true);
});

test('Lead Modal Action Trigger - URL query parsing triggers modal correctly', () => {
  assert.strictEqual(shouldOpenLeadModalFromQuery('?action=new'), true);
  assert.strictEqual(shouldOpenLeadModalFromQuery('?new=true'), true);
  assert.strictEqual(shouldOpenLeadModalFromQuery('?tab=leads&action=new'), true);
  assert.strictEqual(shouldOpenLeadModalFromQuery('?page=2'), false);
  assert.strictEqual(shouldOpenLeadModalFromQuery(''), false);
});
