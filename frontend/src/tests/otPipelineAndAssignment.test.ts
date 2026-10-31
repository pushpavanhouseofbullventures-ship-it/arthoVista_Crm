import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulating role permissions in OT Pipeline UI
export function getOtPipelineUserCapabilities(userRole: string) {
  const isAdmin = ['Admin', 'Super Admin'].includes(userRole);
  const isManager = userRole === 'Manager';
  const isPrivileged = isAdmin || isManager;

  return {
    canDeleteOrder: isPrivileged,
    canEditOrder: isPrivileged,
    canManageTrack: isPrivileged,
    canOverrideOpsLock: isPrivileged,
  };
}

// Helper simulating Unassigned Queue count and query params
export function getUnassignedQueryParams(unassignedOnly: boolean) {
  if (!unassignedOnly) return {};
  return {
    unassignedOnly: 'true',
    limit: 100,
  };
}

test('OT Pipeline UI - Admin and Manager both have full command (Delete, Edit, Manage, Override Lock)', () => {
  const adminCaps = getOtPipelineUserCapabilities('Admin');
  assert.equal(adminCaps.canDeleteOrder, true);
  assert.equal(adminCaps.canEditOrder, true);
  assert.equal(adminCaps.canManageTrack, true);
  assert.equal(adminCaps.canOverrideOpsLock, true);

  const managerCaps = getOtPipelineUserCapabilities('Manager');
  assert.equal(managerCaps.canDeleteOrder, true);
  assert.equal(managerCaps.canEditOrder, true);
  assert.equal(managerCaps.canManageTrack, true);
  assert.equal(managerCaps.canOverrideOpsLock, true);
});

test('OT Pipeline UI - Operation and Finance roles cannot delete orders', () => {
  const opsCaps = getOtPipelineUserCapabilities('Operation');
  assert.equal(opsCaps.canDeleteOrder, false);

  const financeCaps = getOtPipelineUserCapabilities('Finance');
  assert.equal(financeCaps.canDeleteOrder, false);
});

test('Unassigned Queue Params - Generates unassignedOnly query flag', () => {
  const params = getUnassignedQueryParams(true);
  assert.equal(params.unassignedOnly, 'true');
  assert.equal(params.limit, 100);
});
