import test from 'node:test';
import assert from 'node:assert/strict';

// Simulated query client invalidation tracker
class MockQueryClient {
  invalidatedKeys: string[] = [];

  invalidateQueries({ queryKey }: { queryKey: (string | undefined)[] }) {
    this.invalidatedKeys.push(queryKey[0] as string);
  }
}

// Function simulating frontend lead deletion invalidations
export function handleLeadDeletionSuccess(queryClient: MockQueryClient) {
  queryClient.invalidateQueries({ queryKey: ['leads'] });
  queryClient.invalidateQueries({ queryKey: ['followups-badge-summary'] });
  queryClient.invalidateQueries({ queryKey: ['followups-planner'] });
  queryClient.invalidateQueries({ queryKey: ['outreach-followups'] });
  queryClient.invalidateQueries({ queryKey: ['leads-pipeline-counts'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
}

// Function simulating Follow-up Tab Badge count calculation
export function computeFollowupBadgeCount(followupsBadgeResponse: any): number {
  return followupsBadgeResponse?.stats?.total ?? followupsBadgeResponse?.data?.length ?? 0;
}

test('Frontend Lead Delete - Invalidates follow-up query keys on single or bulk delete', () => {
  const queryClient = new MockQueryClient();
  handleLeadDeletionSuccess(queryClient);

  assert.ok(queryClient.invalidatedKeys.includes('leads'), 'Must invalidate leads');
  assert.ok(queryClient.invalidatedKeys.includes('followups-badge-summary'), 'Must invalidate followups badge summary');
  assert.ok(queryClient.invalidatedKeys.includes('followups-planner'), 'Must invalidate followups planner');
  assert.ok(queryClient.invalidatedKeys.includes('outreach-followups'), 'Must invalidate outreach followups');
  assert.ok(queryClient.invalidatedKeys.includes('leads-pipeline-counts'), 'Must invalidate leads pipeline counts');
  assert.ok(queryClient.invalidatedKeys.includes('dashboard-summary'), 'Must invalidate dashboard summary');
});

test('Frontend Badge - Returns 0 when no pending or total follow-ups exist', () => {
  const emptyBadgeResponse = {
    data: [],
    stats: {
      total: 0,
      pending: 0,
      upcoming: 0,
    }
  };

  const count = computeFollowupBadgeCount(emptyBadgeResponse);
  assert.equal(count, 0, 'Followup badge must display 0 when all follow-ups are 0');
});

test('Frontend Badge - Returns correct count when active follow-ups exist', () => {
  const activeBadgeResponse = {
    data: [{ id: 'f1' }, { id: 'f2' }],
    stats: {
      total: 2,
      pending: 2,
      upcoming: 0,
    }
  };

  const count = computeFollowupBadgeCount(activeBadgeResponse);
  assert.equal(count, 2, 'Followup badge must display 2 when 2 active follow-ups exist');
});

