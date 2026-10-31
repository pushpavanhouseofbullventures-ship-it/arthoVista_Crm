import test from 'node:test';
import assert from 'node:assert/strict';
import { transformFilter } from '../models/prismaAdapter';

export const ADMIN_EMAILS = ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'];

export function isMasterAdmin(email?: string): boolean {
  return ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
}

export function isSystemAdmin(role?: string, email?: string): boolean {
  return ['Admin', 'Super Admin'].includes(role || '') || isMasterAdmin(email);
}

/**
 * Permission rule for deleting users:
 * Admin and Manager have all commands.
 * The ONLY difference is: Admin can delete Manager, but Manager cannot delete Manager or Admin.
 */
export function canDeleteEmployee(
  actorRole: string,
  actorEmail: string,
  targetRole: string,
  targetEmail: string
): { allowed: boolean; errorCode?: string; message?: string } {
  const isSuperAdmin = isSystemAdmin(actorRole, actorEmail);
  const isManager = isSuperAdmin || actorRole === 'Manager';

  if (!isManager) {
    return { allowed: false, errorCode: 'FORBIDDEN', message: 'Only Admins and Managers can delete employees.' };
  }

  if (isMasterAdmin(targetEmail)) {
    return { allowed: false, errorCode: 'CANNOT_DELETE_PRIMARY_ADMIN', message: 'Primary Admin accounts cannot be deleted.' };
  }

  if (['Admin', 'Super Admin'].includes(targetRole) || isMasterAdmin(targetEmail)) {
    return { allowed: false, errorCode: 'CANNOT_DELETE_ADMIN', message: 'Admin accounts cannot be deleted.' };
  }

  // The ONLY difference: Admin can delete Manager, but Manager cannot delete Manager
  if (targetRole === 'Manager' && !isSuperAdmin) {
    return { allowed: false, errorCode: 'CANNOT_DELETE_MANAGER', message: 'Managers cannot delete other Managers. Only Admins can delete Managers.' };
  }

  return { allowed: true };
}

/**
 * Permission rule for deactivating users:
 * Admin can deactivate Manager. Manager cannot deactivate Manager or Admin.
 */
export function canToggleEmployeeStatus(
  actorRole: string,
  actorEmail: string,
  targetRole: string,
  targetEmail: string
): { allowed: boolean; errorCode?: string; message?: string } {
  const isSuperAdmin = isSystemAdmin(actorRole, actorEmail);
  const isManager = isSuperAdmin || actorRole === 'Manager';

  if (!isManager) {
    return { allowed: false, errorCode: 'FORBIDDEN', message: 'Only Admins and Managers can toggle employee statuses.' };
  }

  if (['Admin', 'Super Admin'].includes(targetRole) || isMasterAdmin(targetEmail)) {
    return { allowed: false, errorCode: 'CANNOT_DEACTIVATE_ADMIN', message: 'Admin accounts cannot be deactivated.' };
  }

  if (targetRole === 'Manager' && !isSuperAdmin) {
    return { allowed: false, errorCode: 'CANNOT_DEACTIVATE_MANAGER', message: 'Managers cannot deactivate other Managers. Only Admins can deactivate Managers.' };
  }

  return { allowed: true };
}

/**
 * Both Admin and Manager have access to all system commands:
 * settings, integrations, lead creation, bulk actions, pipeline management
 */
export function hasCommandAccess(actorRole: string, actorEmail: string, command: string): boolean {
  const isSuperAdmin = isSystemAdmin(actorRole, actorEmail);
  const isManager = isSuperAdmin || actorRole === 'Manager';

  const privilegedCommands = [
    'settings:write',
    'settings:read',
    'platform:admin',
    'integrations:manage',
    'leads:bulk_delete',
    'leads:bulk_assign',
    'leads:create',
    'employees:register',
    'pipeline:manage'
  ];

  if (privilegedCommands.includes(command)) {
    return isManager;
  }
  return true;
}

// ==========================================
// UNIT TESTS: Admin vs Manager Role Rules
// ==========================================

test('Role Rule 1: Admin CAN delete Manager', () => {
  const res = canDeleteEmployee('Admin', 'admin@example.com', 'Manager', 'manager@example.com');
  assert.strictEqual(res.allowed, true);
});

test('Role Rule 2: Manager CANNOT delete Manager', () => {
  const res = canDeleteEmployee('Manager', 'manager1@example.com', 'Manager', 'manager2@example.com');
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.errorCode, 'CANNOT_DELETE_MANAGER');
});

test('Role Rule 3: Manager CAN delete subordinates (Sale Executive, Team Leader, Finance, Operation, HR)', () => {
  const res1 = canDeleteEmployee('Manager', 'manager@example.com', 'Sale Executive', 'rep@example.com');
  assert.strictEqual(res1.allowed, true);

  const res2 = canDeleteEmployee('Manager', 'manager@example.com', 'Team Leader', 'lead@example.com');
  assert.strictEqual(res2.allowed, true);

  const res3 = canDeleteEmployee('Manager', 'manager@example.com', 'Finance', 'finance@example.com');
  assert.strictEqual(res3.allowed, true);

  const res4 = canDeleteEmployee('Manager', 'manager@example.com', 'Operation', 'op@example.com');
  assert.strictEqual(res4.allowed, true);
});

test('Role Rule 4: Neither Admin nor Manager can delete Admin accounts', () => {
  const resFromAdmin = canDeleteEmployee('Admin', 'admin1@example.com', 'Admin', 'admin2@example.com');
  assert.strictEqual(resFromAdmin.allowed, false);
  assert.strictEqual(resFromAdmin.errorCode, 'CANNOT_DELETE_ADMIN');

  const resFromManager = canDeleteEmployee('Manager', 'manager@example.com', 'Admin', 'admin@example.com');
  assert.strictEqual(resFromManager.allowed, false);
  assert.strictEqual(resFromManager.errorCode, 'CANNOT_DELETE_ADMIN');
});

test('Role Rule 5: Standard Employees cannot delete anyone', () => {
  const res = canDeleteEmployee('Sale Executive', 'rep@example.com', 'Sale Executive', 'rep2@example.com');
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.errorCode, 'FORBIDDEN');
});

test('Status Toggle Rule: Admin can toggle Manager; Manager cannot toggle Manager', () => {
  const adminToggle = canToggleEmployeeStatus('Admin', 'admin@example.com', 'Manager', 'manager@example.com');
  assert.strictEqual(adminToggle.allowed, true);

  const managerToggle = canToggleEmployeeStatus('Manager', 'm1@example.com', 'Manager', 'm2@example.com');
  assert.strictEqual(managerToggle.allowed, false);
  assert.strictEqual(managerToggle.errorCode, 'CANNOT_DEACTIVATE_MANAGER');

  const managerSubordinateToggle = canToggleEmployeeStatus('Manager', 'm1@example.com', 'Sale Executive', 'rep@example.com');
  assert.strictEqual(managerSubordinateToggle.allowed, true);
});

test('Command Parity: Both Admin and Manager have access to all system commands', () => {
  const commands = [
    'settings:write',
    'settings:read',
    'platform:admin',
    'integrations:manage',
    'leads:bulk_delete',
    'leads:bulk_assign',
    'leads:create',
    'employees:register',
    'pipeline:manage'
  ];

  for (const cmd of commands) {
    assert.strictEqual(hasCommandAccess('Admin', 'admin@example.com', cmd), true, `Admin should have access to ${cmd}`);
    assert.strictEqual(hasCommandAccess('Manager', 'manager@example.com', cmd), true, `Manager should have access to ${cmd}`);
    assert.strictEqual(hasCommandAccess('Sale Executive', 'rep@example.com', cmd), false, `Sale Executive should not have access to ${cmd}`);
  }
});

// ==========================================
// UNIT TESTS: SQL & Prisma Filter Translation for $ne
// ==========================================

test('Filter Translation: $ne operator includes null values to match MongoDB semantics in SQL', () => {
  const filter = {
    organizationId: 'org-123',
    isDeleted: false,
    leadType: { $ne: 'HR' }
  };

  const transformed = transformFilter(filter, 'Lead');
  
  assert.strictEqual(transformed.organizationId, 'org-123');
  assert.strictEqual(transformed.isDeleted, false);

  // In PostgreSQL, leadType <> 'HR' drops NULL values unless OR [null, not 'HR'] is included
  const hasNullHandling = 
    (transformed.OR && transformed.OR.some((clause: any) => clause.leadType === null)) ||
    (transformed.AND && transformed.AND.some((clause: any) => clause.OR && clause.OR.some((c: any) => c.leadType === null))) ||
    (transformed.leadType?.not === 'HR' && transformed.OR);

  assert.ok(
    hasNullHandling,
    'Transformed filter must include NULL handling for leadType so non-HR CRM leads with null leadType are not dropped'
  );
});
