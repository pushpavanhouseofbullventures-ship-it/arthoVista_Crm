import test from 'node:test';
import assert from 'node:assert/strict';

// Helper 1: Simulating Dashboard CRM Metric Calculation
export function calculateCrmDashboardMetrics(leads: any[]) {
  // Exclude HR candidates and soft-deleted records from CRM Sales Dashboard
  const crmLeads = leads.filter(l => !l.isDeleted && l.leadType !== 'HR');

  const totalLeads = crmLeads.length;
  const convertedLeads = crmLeads.filter(l => l.status === 'Converted');
  const lostLeads = crmLeads.filter(l => l.status === 'Lost');
  const openLeads = crmLeads.filter(l => l.status !== 'Converted' && l.status !== 'Lost');

  return {
    totalLeads,
    openLeads: openLeads.length,
    convertedLeads: convertedLeads.length,
    lostLeads: lostLeads.length,
  };
}

// Helper 2: Simulating Unassigned Leads Filter Matching
export function isUnassignedLead(lead: any): boolean {
  if (lead.isDeleted) return false;
  if (lead.leadType === 'HR') return false; // HR candidates are not CRM unassigned leads

  // Check if assignedTo is null, undefined, empty string, or missing
  const assigned = lead.assignedTo;
  return assigned === null || assigned === undefined || assigned === '' || assigned === false;
}

// Helper 3: Simulating OT Pipeline Full Command Authorization
export function canManageOtPipeline(userRole?: string, email?: string): { canEdit: boolean; canDelete: boolean; canOverrideLock: boolean } {
  const adminEmails = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'];
  const isSuperAdmin = ['Admin', 'Super Admin'].includes(userRole || '') || adminEmails.includes((email || '').toLowerCase().trim());
  const isManager = userRole === 'Manager';
  const isPrivileged = isSuperAdmin || isManager;

  return {
    canEdit: isPrivileged,
    canDelete: isPrivileged, // Admin and Manager have permission to delete OT orders
    canOverrideLock: isPrivileged, // Admin and Manager can unlock operations directly
  };
}

// ==========================================
// TEST SUITE: Issue 1 - Dashboard vs Leads
// ==========================================

test('Dashboard Metrics - Completely ignores HR candidates (leadType === "HR")', () => {
  const mockLeads = [
    { id: '1', name: 'Sunita Rao', leadId: 'HR-10004', leadType: 'HR', status: 'Open', isDeleted: false },
    { id: '2', name: 'Rohit Sharma', leadId: 'HR-10001', leadType: 'HR', status: 'New', isDeleted: false },
    { id: '3', name: 'Neha Gupta', leadId: 'HR-10002', leadType: 'HR', status: 'Contacted', isDeleted: false },
    { id: '4', name: 'Vikas Singh', leadId: 'HR-10003', leadType: 'HR', status: 'Interview Scheduled', isDeleted: false },
  ];

  // When only HR leads exist in DB, CRM Sales Dashboard must report 0
  const metrics = calculateCrmDashboardMetrics(mockLeads);
  assert.equal(metrics.totalLeads, 0, 'Total CRM Leads on Dashboard must be 0 when only HR leads exist');
  assert.equal(metrics.openLeads, 0, 'Open CRM Leads on Dashboard must be 0 when only HR leads exist');
});

test('Dashboard Metrics - Accurately counts non-HR sales leads', () => {
  const mockLeads = [
    { id: '1', name: 'Sunita Rao', leadType: 'HR', status: 'Open', isDeleted: false },
    { id: '2', name: 'Rohit Sharma', leadType: 'HR', status: 'New', isDeleted: false },
    { id: '3', name: 'Company Deal A', leadType: 'In Process', status: 'Open', isDeleted: false },
    { id: '4', name: 'Company Deal B', leadType: null, status: 'Converted', isDeleted: false },
  ];

  const metrics = calculateCrmDashboardMetrics(mockLeads);
  assert.equal(metrics.totalLeads, 2, 'Total CRM Leads should be 2');
  assert.equal(metrics.openLeads, 1, 'Open CRM Leads should be 1');
  assert.equal(metrics.convertedLeads, 1, 'Converted CRM Leads should be 1');
});

// ==========================================
// TEST SUITE: Issue 2 - OT Pipeline Commands
// ==========================================

test('OT Pipeline Permissions - Admin has full command (Edit, Delete, Override Lock)', () => {
  const perms = canManageOtPipeline('Admin', 'admin@example.com');
  assert.equal(perms.canEdit, true, 'Admin must be able to edit OT orders');
  assert.equal(perms.canDelete, true, 'Admin must be able to delete OT orders');
  assert.equal(perms.canOverrideLock, true, 'Admin must be able to override operations lock');
});

test('OT Pipeline Permissions - Manager has full command (Edit, Delete, Override Lock)', () => {
  const perms = canManageOtPipeline('Manager', 'manager@arthovista.com');
  assert.equal(perms.canEdit, true, 'Manager must be able to edit OT orders');
  assert.equal(perms.canDelete, true, 'Manager must be able to delete OT orders');
  assert.equal(perms.canOverrideLock, true, 'Manager must be able to override operations lock');
});

test('OT Pipeline Permissions - Standard employees cannot delete OT orders', () => {
  const perms = canManageOtPipeline('Sale Executive', 'rep@arthovista.com');
  assert.equal(perms.canDelete, false, 'Standard sales rep must not be able to delete OT orders');
});

// ==========================================
// TEST SUITE: Issue 3 - Unassigned Leads
// ==========================================

test('Unassigned Leads Filter - Matches null, undefined, or empty string assignedTo', () => {
  const lead1 = { id: 'l1', name: 'Lead 1', assignedTo: null, isDeleted: false };
  const lead2 = { id: 'l2', name: 'Lead 2', assignedTo: undefined, isDeleted: false };
  const lead3 = { id: 'l3', name: 'Lead 3', assignedTo: '', isDeleted: false };
  const lead4 = { id: 'l4', name: 'Lead 4', assignedTo: 'user-123', isDeleted: false };

  assert.equal(isUnassignedLead(lead1), true, 'Lead with assignedTo null is unassigned');
  assert.equal(isUnassignedLead(lead2), true, 'Lead with assignedTo undefined is unassigned');
  assert.equal(isUnassignedLead(lead3), true, 'Lead with assignedTo empty string is unassigned');
  assert.equal(isUnassignedLead(lead4), false, 'Lead assigned to user-123 is NOT unassigned');
});

test('Unassigned Leads Filter - Excludes deleted leads and HR candidate leads', () => {
  const deletedLead = { id: 'l5', name: 'Deleted Lead', assignedTo: null, isDeleted: true };
  const hrCandidate = { id: 'l6', name: 'HR Applicant', assignedTo: null, isDeleted: false, leadType: 'HR' };

  assert.equal(isUnassignedLead(deletedLead), false, 'Deleted lead must not appear in unassigned queue');
  assert.equal(isUnassignedLead(hrCandidate), false, 'HR applicant must not appear in CRM unassigned queue');
});
