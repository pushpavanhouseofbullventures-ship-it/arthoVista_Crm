import test from 'node:test';
import assert from 'node:assert/strict';

// Helper simulating follow-up validation logic
export function isValidFollowUp(f: any): boolean {
  // If linked to a lead, the lead must exist and not be soft-deleted
  if (f.leadId) {
    if (typeof f.leadId === 'object') {
      if (f.leadId.isDeleted === true) return false;
      // If lead object is empty or has no id/name/leadId
      if (!f.leadId.id && !f.leadId._id && !f.leadId.name && !f.leadId.leadId) return false;
    }
  }

  // Pure orphan without lead and without customer
  if (!f.leadId && !f.customerId && !f.lead && !f.customer) {
    return false;
  }

  // Unmatched SIM Call
  const isSimCall = f.purpose && /SIM Call/i.test(f.purpose);
  if (isSimCall && !f.leadId && !f.customerId && !f.lead && !f.customer) {
    return false;
  }

  return true;
}

// Helper simulating stats calculation for follow-ups
export function calculateFollowUpStats(followups: any[], todayStart: Date, todayEnd: Date) {
  const valid = followups.filter(isValidFollowUp);
  let totalCount = 0;
  let waCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let pendingCount = 0;
  let completedCount = 0;
  let todayDueCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;

  for (const f of valid) {
    totalCount++;
    const ch = f.channel || f.type;
    if (ch === 'whatsapp') waCount++;
    else if (ch === 'email') emailCount++;
    else if (ch === 'phone' || ch === 'call') phoneCount++;

    if (f.status === 'completed') {
      completedCount++;
    } else {
      const fDate = new Date(f.date);
      if (fDate > todayEnd) {
        upcomingCount++;
      } else {
        pendingCount++;
        if (fDate >= todayStart && fDate <= todayEnd) todayDueCount++;
        else if (fDate < todayStart) overdueCount++;
      }
    }
  }

  return {
    total: totalCount,
    pending: pendingCount,
    upcoming: upcomingCount,
    completed: completedCount,
    todayDue: todayDueCount,
    overdue: overdueCount,
    whatsapp: waCount,
    email: emailCount,
    phone: phoneCount,
  };
}

// Simulated mock DB collection for cascade testing
class MockDB {
  leads: any[] = [];
  followups: any[] = [];

  async deleteLead(id: string, orgId: string) {
    const lead = this.leads.find(l => l.id === id && l.organizationId === orgId);
    if (!lead) return null;
    lead.isDeleted = true;

    // Cascade delete associated follow-ups
    this.followups = this.followups.filter(f => !(f.leadId === id && f.organizationId === orgId));
    return lead;
  }

  async bulkDeleteLeads(ids: string[], orgId: string) {
    const targetSet = new Set(ids);
    this.leads.forEach(l => {
      if (targetSet.has(l.id) && l.organizationId === orgId) {
        l.isDeleted = true;
      }
    });

    // Cascade delete associated follow-ups
    this.followups = this.followups.filter(f => !(targetSet.has(f.leadId) && f.organizationId === orgId));
  }
}

test('FollowUp Filter - Rejects follow-ups where linked lead has isDeleted === true', () => {
  const followUpDeletedLead = {
    id: 'f1',
    leadId: { id: 'l1', name: 'Lead 1', isDeleted: true },
    status: 'pending',
    date: new Date()
  };

  assert.equal(isValidFollowUp(followUpDeletedLead), false, 'Follow-up for soft-deleted lead must be rejected');
});

test('FollowUp Filter - Accepts follow-ups where linked lead is active (isDeleted === false)', () => {
  const followUpActiveLead = {
    id: 'f2',
    leadId: { id: 'l2', name: 'Lead 2', isDeleted: false },
    status: 'pending',
    date: new Date()
  };

  assert.equal(isValidFollowUp(followUpActiveLead), true, 'Follow-up for active lead must be valid');
});

test('FollowUp Filter - Rejects orphan follow-ups with no lead and no customer', () => {
  const orphanFollowUp = {
    id: 'f3',
    leadId: null,
    customerId: null,
    status: 'pending',
    date: new Date()
  };

  assert.equal(isValidFollowUp(orphanFollowUp), false, 'Pure orphan follow-up must be rejected');
});

test('FollowUp Filter - Accepts follow-ups linked to active customer', () => {
  const customerFollowUp = {
    id: 'f4',
    leadId: null,
    customerId: { id: 'c1', name: 'Client X' },
    status: 'pending',
    date: new Date()
  };

  assert.equal(isValidFollowUp(customerFollowUp), true, 'Customer follow-up should be valid');
});

test('FollowUp Stats - When all leads are deleted, pending/total follow-up stats are strictly 0', () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 7 follow-ups (matching user screenshot) all pointing to deleted leads
  const mockFollowups = [
    { id: 'f1', leadId: { id: 'ld-10024', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f2', leadId: { id: 'ld-10005', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f3', leadId: { id: 'ld-10007', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f4', leadId: { id: 'ld-10001', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f5', leadId: { id: 'ld-10022', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f6', leadId: { id: 'ld-10023', isDeleted: true }, status: 'pending', date: new Date() },
    { id: 'f7', leadId: { id: 'ld-10020', isDeleted: true }, status: 'pending', date: new Date() },
  ];

  const stats = calculateFollowUpStats(mockFollowups, todayStart, todayEnd);
  assert.equal(stats.total, 0, 'Total follow-ups must be 0 when all leads are deleted');
  assert.equal(stats.pending, 0, 'Pending follow-ups must be 0 when all leads are deleted');
  assert.equal(stats.upcoming, 0, 'Upcoming follow-ups must be 0 when all leads are deleted');
});

test('Cascade Deletion - Deleting a single lead deletes all its associated follow-up records', async () => {
  const db = new MockDB();
  db.leads = [
    { id: 'lead-1', organizationId: 'org-1', name: 'Lead 1', isDeleted: false },
    { id: 'lead-2', organizationId: 'org-1', name: 'Lead 2', isDeleted: false },
  ];
  db.followups = [
    { id: 'f-1', organizationId: 'org-1', leadId: 'lead-1', status: 'pending' },
    { id: 'f-2', organizationId: 'org-1', leadId: 'lead-1', status: 'pending' },
    { id: 'f-3', organizationId: 'org-1', leadId: 'lead-2', status: 'pending' },
  ];

  await db.deleteLead('lead-1', 'org-1');

  // Verify lead soft deleted
  assert.equal(db.leads.find(l => l.id === 'lead-1')?.isDeleted, true);

  // Verify follow-ups for lead-1 are purged
  const remainingFollowups = db.followups.filter(f => f.leadId === 'lead-1');
  assert.equal(remainingFollowups.length, 0, 'Follow-ups for lead-1 must be deleted');

  // Lead-2 followups must remain intact
  const lead2Followups = db.followups.filter(f => f.leadId === 'lead-2');
  assert.equal(lead2Followups.length, 1, 'Lead-2 follow-up must be preserved');
});

test('Cascade Deletion - Bulk deleting leads deletes all associated follow-ups in batch', async () => {
  const db = new MockDB();
  db.leads = [
    { id: 'lead-1', organizationId: 'org-1', name: 'Lead 1', isDeleted: false },
    { id: 'lead-2', organizationId: 'org-1', name: 'Lead 2', isDeleted: false },
    { id: 'lead-3', organizationId: 'org-1', name: 'Lead 3', isDeleted: false },
  ];
  db.followups = [
    { id: 'f-1', organizationId: 'org-1', leadId: 'lead-1', status: 'pending' },
    { id: 'f-2', organizationId: 'org-1', leadId: 'lead-2', status: 'pending' },
    { id: 'f-3', organizationId: 'org-1', leadId: 'lead-3', status: 'pending' },
  ];

  // Bulk delete lead-1 and lead-2
  await db.bulkDeleteLeads(['lead-1', 'lead-2'], 'org-1');

  assert.equal(db.leads.find(l => l.id === 'lead-1')?.isDeleted, true);
  assert.equal(db.leads.find(l => l.id === 'lead-2')?.isDeleted, true);
  assert.equal(db.leads.find(l => l.id === 'lead-3')?.isDeleted, false);

  assert.equal(db.followups.length, 1, 'Only lead-3 follow-up should remain');
  assert.equal(db.followups[0].leadId, 'lead-3');
});

