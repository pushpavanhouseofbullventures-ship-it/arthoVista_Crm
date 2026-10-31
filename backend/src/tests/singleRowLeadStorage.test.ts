import test from 'node:test';
import assert from 'node:assert/strict';

export interface SingleRowLead {
  id: string;
  leadId: string;
  name: string;
  phone: string;
  status: string;
  isDeleted: boolean;
  callHistory: Array<{
    callId: string;
    phoneNumber: string;
    callType: string;
    duration: number;
    outcome: string;
    date: Date | string;
    notes?: string;
  }>;
  followUpHistory: Array<{
    followUpId: string;
    date: Date | string;
    type: string;
    status: string;
    notes?: string;
  }>;
  activityHistory: Array<{
    activityId: string;
    type: string;
    content: string;
    date: Date | string;
  }>;
}

// Helper: Append Call to Single-Row Lead
export function appendCallToLead(lead: SingleRowLead, call: any): SingleRowLead {
  const history = Array.isArray(lead.callHistory) ? [...lead.callHistory] : [];
  history.push({
    callId: call.callId || `call_${Date.now()}`,
    phoneNumber: call.phoneNumber || lead.phone,
    callType: call.callType || 'OUTGOING',
    duration: call.duration || 0,
    outcome: call.outcome || 'Connected',
    date: call.date || new Date(),
    notes: call.notes || ''
  });
  return {
    ...lead,
    callHistory: history
  };
}

// Helper: Append FollowUp to Single-Row Lead
export function appendFollowUpToLead(lead: SingleRowLead, followup: any): SingleRowLead {
  const history = Array.isArray(lead.followUpHistory) ? [...lead.followUpHistory] : [];
  history.push({
    followUpId: followup.followUpId || `fu_${Date.now()}`,
    date: followup.date || new Date(),
    type: followup.type || 'phone',
    status: followup.status || 'pending',
    notes: followup.notes || ''
  });
  return {
    ...lead,
    followUpHistory: history
  };
}

// Helper: Single-Row Lead Cascade Deletion
export function deleteSingleRowLead(
  leads: SingleRowLead[],
  targetLeadId: string,
  relationalCallLogs: any[] = [],
  relationalFollowUps: any[] = [],
  relationalActivities: any[] = []
) {
  // 1. Delete or mark soft-deleted with wiped arrays
  const updatedLeads = leads.map(l => {
    if (l.id === targetLeadId || l.leadId === targetLeadId) {
      return {
        ...l,
        isDeleted: true,
        callHistory: [],
        followUpHistory: [],
        activityHistory: []
      };
    }
    return l;
  });

  // 2. Cascade delete from relational tables
  const remainingCallLogs = relationalCallLogs.filter(
    c => c.leadId !== targetLeadId && c.leadId !== leads.find(l => l.leadId === targetLeadId)?.id
  );
  const remainingFollowUps = relationalFollowUps.filter(
    f => f.leadId !== targetLeadId && f.leadId !== leads.find(l => l.leadId === targetLeadId)?.id
  );
  const remainingActivities = relationalActivities.filter(
    a => a.leadId !== targetLeadId && a.leadId !== leads.find(l => l.leadId === targetLeadId)?.id
  );

  return {
    leads: updatedLeads,
    remainingCallLogs,
    remainingFollowUps,
    remainingActivities
  };
}

// Helper: Bulk Single-Row Lead Cascade Deletion
export function bulkDeleteSingleRowLeads(
  leads: SingleRowLead[],
  targetLeadIds: string[],
  relationalCallLogs: any[] = []
) {
  const targetSet = new Set(targetLeadIds);
  const updatedLeads = leads.map(l => {
    if (targetSet.has(l.id) || targetSet.has(l.leadId)) {
      return {
        ...l,
        isDeleted: true,
        callHistory: [],
        followUpHistory: [],
        activityHistory: []
      };
    }
    return l;
  });

  const remainingCallLogs = relationalCallLogs.filter(
    c => !targetSet.has(c.leadId)
  );

  return {
    leads: updatedLeads,
    remainingCallLogs
  };
}

// Helper: Extract Call Logs from active leads for Mobile SIM Sync
export function getActiveCallLogs(leads: SingleRowLead[], standaloneCallLogs: any[] = []): any[] {
  // Only extract from active (non-deleted) leads
  const activeLeads = leads.filter(l => !l.isDeleted);
  const logsFromSingleRow: any[] = [];

  for (const lead of activeLeads) {
    if (Array.isArray(lead.callHistory)) {
      for (const call of lead.callHistory) {
        logsFromSingleRow.push({
          ...call,
          leadId: lead.id,
          leadName: lead.name,
          leadCode: lead.leadId
        });
      }
    }
  }

  // Filter standalone call logs so no calls from deleted leads leak through
  const activeLeadIds = new Set(activeLeads.map(l => l.id));
  const filteredStandalone = standaloneCallLogs.filter(c => activeLeadIds.has(c.leadId));

  return [...logsFromSingleRow, ...filteredStandalone];
}

// ==========================================
// TEST SUITE: Single-Row Database Storage
// ==========================================

test('Single-Row Storage - Call logs append directly into lead row by leadId', () => {
  let lead: SingleRowLead = {
    id: 'lead-1',
    leadId: 'LD-10024',
    name: 'Lead Customer 24',
    phone: '9876500023',
    status: 'Open',
    isDeleted: false,
    callHistory: [],
    followUpHistory: [],
    activityHistory: []
  };

  lead = appendCallToLead(lead, {
    callId: 'call-101',
    phoneNumber: '9876500023',
    callType: 'OUTGOING',
    duration: 45,
    outcome: 'Connected',
    notes: 'Client interested in quotation'
  });

  lead = appendCallToLead(lead, {
    callId: 'call-102',
    phoneNumber: '9876500023',
    callType: 'INCOMING',
    duration: 120,
    outcome: 'Connected',
    notes: 'Discussed GST filing'
  });

  assert.equal(lead.callHistory.length, 2);
  assert.equal(lead.callHistory[0].callId, 'call-101');
  assert.equal(lead.callHistory[0].duration, 45);
  assert.equal(lead.callHistory[1].callType, 'INCOMING');
  assert.equal(lead.callHistory[1].duration, 120);
});

test('Single-Row Storage - FollowUp history appends directly into lead row', () => {
  let lead: SingleRowLead = {
    id: 'lead-2',
    leadId: 'LD-10025',
    name: 'Lead Customer 25',
    phone: '9876500024',
    status: 'Open',
    isDeleted: false,
    callHistory: [],
    followUpHistory: [],
    activityHistory: []
  };

  lead = appendFollowUpToLead(lead, {
    followUpId: 'fu-201',
    date: '2026-11-01T10:00:00Z',
    type: 'phone',
    status: 'pending',
    notes: 'Follow up on audit proposal'
  });

  assert.equal(lead.followUpHistory.length, 1);
  assert.equal(lead.followUpHistory[0].followUpId, 'fu-201');
  assert.equal(lead.followUpHistory[0].status, 'pending');
});

test('Single-Row Deletion - Deleting a lead clears its call history and cascades relational records', () => {
  const leads: SingleRowLead[] = [
    {
      id: 'lead-1',
      leadId: 'LD-10024',
      name: 'Lead Customer 24',
      phone: '9876500023',
      status: 'Open',
      isDeleted: false,
      callHistory: [{ callId: 'c1', phoneNumber: '9876500023', callType: 'OUTGOING', duration: 30, outcome: 'Connected', date: new Date() }],
      followUpHistory: [{ followUpId: 'fu1', date: new Date(), type: 'phone', status: 'pending' }],
      activityHistory: [{ activityId: 'act1', type: 'call', content: 'Outbound call', date: new Date() }]
    },
    {
      id: 'lead-2',
      leadId: 'LD-10025',
      name: 'Lead Customer 25',
      phone: '9876500024',
      status: 'Open',
      isDeleted: false,
      callHistory: [{ callId: 'c2', phoneNumber: '9876500024', callType: 'OUTGOING', duration: 60, outcome: 'Connected', date: new Date() }],
      followUpHistory: [],
      activityHistory: []
    }
  ];

  const relationalCallLogs = [
    { id: 'rc1', leadId: 'lead-1', duration: 30 },
    { id: 'rc2', leadId: 'lead-2', duration: 60 }
  ];

  const result = deleteSingleRowLead(leads, 'lead-1', relationalCallLogs);

  // Deleted lead must have empty callHistory and isDeleted = true
  const deletedLead = result.leads.find(l => l.id === 'lead-1');
  assert.equal(deletedLead?.isDeleted, true);
  assert.equal(deletedLead?.callHistory.length, 0);
  assert.equal(deletedLead?.followUpHistory.length, 0);

  // Active lead remains unaffected
  const activeLead = result.leads.find(l => l.id === 'lead-2');
  assert.equal(activeLead?.isDeleted, false);
  assert.equal(activeLead?.callHistory.length, 1);

  // Relational call logs cascaded
  assert.equal(result.remainingCallLogs.length, 1);
  assert.equal(result.remainingCallLogs[0].leadId, 'lead-2');
});

test('Bulk Deletion - Deleting all leads completely wipes all call history across the board', () => {
  const leads: SingleRowLead[] = [
    {
      id: 'lead-1',
      leadId: 'LD-10024',
      name: 'Lead Customer 24',
      phone: '9876500023',
      status: 'Open',
      isDeleted: false,
      callHistory: [{ callId: 'c1', phoneNumber: '9876500023', callType: 'OUTGOING', duration: 30, outcome: 'Connected', date: new Date() }],
      followUpHistory: [],
      activityHistory: []
    },
    {
      id: 'lead-2',
      leadId: 'LD-10025',
      name: 'Lead Customer 25',
      phone: '9876500024',
      status: 'Open',
      isDeleted: false,
      callHistory: [{ callId: 'c2', phoneNumber: '9876500024', callType: 'OUTGOING', duration: 60, outcome: 'Connected', date: new Date() }],
      followUpHistory: [],
      activityHistory: []
    }
  ];

  const relationalCallLogs = [
    { id: 'rc1', leadId: 'lead-1', duration: 30 },
    { id: 'rc2', leadId: 'lead-2', duration: 60 }
  ];

  // Bulk delete both leads
  const result = bulkDeleteSingleRowLeads(leads, ['lead-1', 'lead-2'], relationalCallLogs);

  // Both leads marked deleted and histories wiped
  assert.equal(result.leads.every(l => l.isDeleted && l.callHistory.length === 0), true);
  // Relational logs completely empty
  assert.equal(result.remainingCallLogs.length, 0);
});

test('Mobile SIM Sync Logs - When all leads are deleted, returned call logs are strictly 0', () => {
  const leads: SingleRowLead[] = [
    {
      id: 'lead-1',
      leadId: 'LD-10024',
      name: 'Lead Customer 24',
      phone: '9876500023',
      status: 'Open',
      isDeleted: true, // Lead was deleted
      callHistory: [],
      followUpHistory: [],
      activityHistory: []
    }
  ];

  const orphanedStandaloneLogs = [
    { id: 'orphan-1', leadId: 'lead-1', duration: 30 }
  ];

  const activeLogs = getActiveCallLogs(leads, orphanedStandaloneLogs);

  // Strictly 0 call logs returned when lead is deleted
  assert.equal(activeLogs.length, 0);
});

test('Mobile SIM Sync Logs - Active leads return their single-row call history with contact details', () => {
  const leads: SingleRowLead[] = [
    {
      id: 'lead-1',
      leadId: 'LD-10024',
      name: 'Lead Customer 24',
      phone: '9876500023',
      status: 'Open',
      isDeleted: false,
      callHistory: [
        { callId: 'c1', phoneNumber: '9876500023', callType: 'OUTGOING', duration: 45, outcome: 'Connected', date: new Date() }
      ],
      followUpHistory: [],
      activityHistory: []
    }
  ];

  const activeLogs = getActiveCallLogs(leads, []);

  assert.equal(activeLogs.length, 1);
  assert.equal(activeLogs[0].leadCode, 'LD-10024');
  assert.equal(activeLogs[0].leadName, 'Lead Customer 24');
  assert.equal(activeLogs[0].duration, 45);
});
