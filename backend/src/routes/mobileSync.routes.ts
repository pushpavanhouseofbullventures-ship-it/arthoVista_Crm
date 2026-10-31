import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { Lead } from '../models/Lead';
import { Customer } from '../models/Customer';
import { FollowUp } from '../models/FollowUp';
import { CallLog } from '../models/CallLog';
import { Activity } from '../models/Activity';
import { User } from '../models/User';
import logger from '../utils/logger';

const router = Router();

// Apply auth and tenant isolation
router.use(authenticate, tenantIsolation);

/**
 * Helper to normalize phone numbers (strip non-digits, extracts last 10 digits for search)
 */
function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

/**
 * 1. BATCH SYNC CALL LOGS FROM ANDROID PHONES (₹0 Telephony Sync)
 */
router.post('/calls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { callLogs, deviceName = 'Android Phone' } = req.body;

    if (!Array.isArray(callLogs) || callLogs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid array of callLogs is required.',
        errorCode: 'EMPTY_CALL_LOGS'
      });
    }

    const employee = await User.findById(userId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Sales Agent';

    let syncedCount = 0;
    let matchedLeadCount = 0;
    let matchedCustomerCount = 0;
    const processedLogs: any[] = [];
    const seenInBatch = new Set<string>();

    for (const log of callLogs) {
      const {
        phoneNumber,
        contactName,
        callType = 'OUTGOING', // INCOMING, OUTGOING, MISSED, REJECTED
        duration = 0, // in seconds
        timestamp,
        notes = '',
        simSlot = 1
      } = log;

      if (!phoneNumber) continue;

      const norm = normalizePhone(phoneNumber);
      const callDate = timestamp ? new Date(Number(timestamp)) : new Date();

      // Deduplicate within the same request batch
      const batchKey = `${norm}_${Math.floor(callDate.getTime() / 30000)}`;
      if (seenInBatch.has(batchKey)) {
        continue;
      }
      seenInBatch.add(batchKey);

      // Find matching Lead in organization
      let matchedLead = await Lead.findOne({
        organizationId: orgId,
        isDeleted: false,
        phone: { $regex: norm }
      });

      // Find matching Customer if no Lead
      let matchedCustomer = null;
      if (!matchedLead) {
        matchedCustomer = await Customer.findOne({
          organizationId: orgId,
          isDeleted: false,
          phone: { $regex: norm }
        });
      }

      // Filter: Ignore calls that do not match any CRM Lead or Customer
      if (!matchedLead && !matchedCustomer) {
        continue;
      }

      if (matchedLead) matchedLeadCount++;
      if (matchedCustomer) matchedCustomerCount++;

      // Prevent exact duplicate insertion within 90-second window
      const windowStart = new Date(callDate.getTime() - 90000);
      const windowEnd = new Date(callDate.getTime() + 90000);

      const existingFollowUp = await FollowUp.findOne({
        organizationId: orgId,
        assignedTo: userId,
        channel: 'phone',
        date: { $gte: windowStart, $lte: windowEnd },
        purpose: { $regex: norm }
      });

      if (existingFollowUp) {
        continue; // skip duplicate sync
      }

      const outcome = duration > 0 
        ? 'Connected' 
        : (callType === 'MISSED' || callType === 'REJECTED' ? 'Missed / Rejected' : 'No Answer');

      // Create FollowUp record
      const followUp = await FollowUp.create({
        organizationId: orgId,
        leadId: matchedLead?._id,
        customerId: matchedCustomer?._id,
        assignedTo: userId,
        type: 'phone',
        channel: 'phone',
        date: callDate,
        purpose: `SIM Call (${callType}) — ${contactName || phoneNumber} [${norm}]`,
        status: 'completed',
        outcome,
        notes: notes || `Call duration: ${duration}s via SIM ${simSlot}. (${deviceName})`,
        channelDetails: {
          callDuration: duration,
          callOutcome: outcome,
          source: 'android_sim_sync',
          simSlot,
          callType,
          phoneNumber,
          contactName,
          deviceName
        }
      });

      // Also mirror to CallLog table for unified telephony & analytics reporting
      try {
        await CallLog.create({
          organizationId: orgId,
          leadId: matchedLead?._id,
          customerId: matchedCustomer?._id,
          employeeId: userId,
          phoneNumber,
          direction: callType === 'INCOMING' ? 'inbound' : 'outbound',
          provider: 'sim_sync',
          startTime: callDate,
          endTime: new Date(callDate.getTime() + duration * 1000),
          duration,
          status: 'completed',
          outcome,
          notes: notes || `Call duration: ${duration}s via SIM ${simSlot}. (${deviceName})`,
          nextFollowUpId: followUp._id
        });
      } catch (callLogErr) {
        logger.warn('[MobileSync] Failed to mirror call to CallLog:', callLogErr);
      }

      // If matched with Lead, update Lead single-row call history, timeline and timestamps
      if (matchedLead) {
        const callEntry = {
          callId: followUp._id || (followUp as any)?.id || `${Date.now()}`,
          phoneNumber,
          contactName: matchedLead.name,
          callType,
          direction: callType === 'INCOMING' ? 'inbound' : 'outbound',
          duration,
          outcome,
          date: callDate,
          notes: notes || `Call duration: ${duration}s via SIM ${simSlot}. (${deviceName})`,
          employeeId: userId,
          employeeName,
          simSlot,
          deviceName,
          source: 'android_sim_sync'
        };

        const existingCallHistory = Array.isArray((matchedLead as any).callHistory) ? (matchedLead as any).callHistory : [];
        (matchedLead as any).callHistory = [...existingCallHistory, callEntry];

        await Activity.create({
          organizationId: orgId,
          leadId: matchedLead._id,
          userId,
          type: 'call',
          content: `📱 SIM Call (${callType}): ${duration}s connected with ${matchedLead.name}. Outcome: ${outcome}. Logged by ${employeeName} via Android SIM.`,
          metadata: {
            channel: 'phone',
            duration,
            outcome,
            callType,
            simSlot,
            phoneNumber,
            source: 'android_sim_sync'
          }
        });

        matchedLead.lastFollowUpDate = callDate;
        matchedLead.lastContacted = callDate;
        if (matchedLead.status === 'New') {
          matchedLead.status = 'Open';
        }
        await matchedLead.save();
      }

      syncedCount++;
      processedLogs.push({
        followUpId: followUp._id,
        phoneNumber,
        matchedLead: matchedLead ? { id: matchedLead._id, name: matchedLead.name, leadId: matchedLead.leadId } : null,
        matchedCustomer: matchedCustomer ? { id: matchedCustomer._id, name: matchedCustomer.name } : null,
        duration,
        callType
      });
    }

    logger.info(`[MobileSync] Synced ${syncedCount} call(s) for user ${employeeName}`);

    return res.json({
      success: true,
      message: `Successfully synced ${syncedCount} call log(s) from ${deviceName}.`,
      data: {
        syncedCount,
        matchedLeadCount,
        matchedCustomerCount,
        logs: processedLogs
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET ASSIGNED LEADS FOR OFFLINE / FAST CALLER ID ON MOBILE
 */
router.get('/assigned-leads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const userRole = (req as any).userRole;
    const isPrivileged = ['Admin', 'Super Admin', 'Manager', 'Team Leader'].includes(userRole);

    const filter: any = { organizationId: orgId, isDeleted: false };
    if (!isPrivileged) {
      filter.assignedTo = userId;
    }

    const leads = await Lead.find(filter)
      .select('_id leadId name company phone status source priority')
      .sort({ updatedAt: -1 })
      .limit(500);

    return res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const userRole = (req as any).userRole;
    const isPrivileged = ['Admin', 'Super Admin', 'Manager'].includes(userRole) || ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(req.user?.email || '');
    const { employeeId } = req.query;

    const targetEmployeeId = employeeId === 'mine' ? userId : (employeeId && employeeId !== 'all' ? employeeId : undefined);

    // 1. Fetch active (non-deleted) leads to enforce single-row history & prevent deleted lead data leak
    const leadFilter: any = { organizationId: orgId, isDeleted: false };
    if (!isPrivileged && userId) {
      leadFilter.assignedTo = userId;
    } else if (targetEmployeeId) {
      leadFilter.assignedTo = targetEmployeeId;
    }

    const activeLeads = await Lead.find(leadFilter)
      .select('_id id leadId name company phone status assignedTo callHistory')
      .populate('assignedTo', 'firstName lastName email');

    const activeLeadIds = activeLeads.map((l: any) => (l._id || l.id).toString()).filter(Boolean);
    const activeLeadIdSet = new Set(activeLeadIds);

    // Single-Row Storage Extraction: extract call records directly from active leads
    const singleRowCallLogs: any[] = [];
    for (const l of activeLeads) {
      const history = Array.isArray((l as any).callHistory) ? (l as any).callHistory : [];
      const emp = l.assignedTo as any;
      for (const item of history) {
        singleRowCallLogs.push({
          _id: item.callId || item._id || `${(l._id || l.id)}_${new Date(item.date).getTime()}`,
          id: item.callId || item._id || `${(l._id || l.id)}_${new Date(item.date).getTime()}`,
          source: 'single_row_lead',
          provider: item.source || 'android_sim_sync',
          leadId: {
            _id: l._id || l.id,
            id: l.id || l._id,
            name: l.name,
            leadId: l.leadId,
            company: l.company,
            phone: l.phone,
            status: l.status
          },
          customerId: null,
          assignedTo: emp ? {
            _id: emp._id || emp.id,
            id: emp.id || emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email
          } : null,
          date: item.date,
          outcome: item.outcome || 'Connected',
          notes: item.notes,
          channelDetails: {
            callType: item.callType || 'OUTGOING',
            callDuration: item.duration || 0,
            simSlot: item.simSlot || 1,
            phoneNumber: item.phoneNumber || l.phone,
            contactName: item.contactName || l.name,
            deviceName: item.deviceName || 'Android SIM',
            source: item.source || 'android_sim_sync'
          }
        });
      }
    }

    // 2. Fetch from CallLog and FollowUp tables (strictly constrained to active leads or active customers)
    const callLogQuery: any = { organizationId: orgId };
    const followUpQuery: any = {
      organizationId: orgId,
      channel: 'phone'
    };

    if (!isPrivileged && userId) {
      callLogQuery.leadId = { $in: activeLeadIds };
      followUpQuery.leadId = { $in: activeLeadIds };
    } else if (targetEmployeeId) {
      callLogQuery.$and = [
        { organizationId: orgId },
        {
          $or: [
            { employeeId: targetEmployeeId, leadId: { $in: activeLeadIds } },
            { leadId: { $in: activeLeadIds } }
          ]
        }
      ];
      followUpQuery.$and = [
        { organizationId: orgId, channel: 'phone' },
        {
          $or: [
            { assignedTo: targetEmployeeId, leadId: { $in: activeLeadIds } },
            { leadId: { $in: activeLeadIds } }
          ]
        }
      ];
    } else {
      // Privileged: only show calls associated with active leads or valid customers
      callLogQuery.$or = [
        { leadId: { $in: activeLeadIds } },
        { customerId: { $exists: true, $ne: null } }
      ];
      followUpQuery.$or = [
        { leadId: { $in: activeLeadIds } },
        { customerId: { $exists: true, $ne: null } }
      ];
    }

    const callLogs = await CallLog.find(callLogQuery)
      .populate('employeeId', 'firstName lastName email')
      .populate('leadId', 'name leadId company phone status')
      .populate('customerId', 'name customerId phone')
      .sort({ startTime: -1, createdAt: -1 })
      .limit(200);

    const followUps = await FollowUp.find(followUpQuery)
      .populate('assignedTo', 'firstName lastName email')
      .populate('leadId', 'name leadId company phone status')
      .populate('customerId', 'name customerId phone')
      .sort({ date: -1 })
      .limit(100);

    // 3. Normalize CallLog records into unified format
    const mappedCallLogs = callLogs.map((c: any) => {
      const callDate = c.startTime || c.createdAt;
      const emp = c.employeeId || c.employee;
      const lead = c.leadId || c.lead;
      const customer = c.customerId || c.customer;
      const dir = c.direction || 'outbound';
      const out = c.outcome || 'Connected';
      const callType = dir === 'inbound'
        ? 'INCOMING'
        : (['Missed', 'Missed / Rejected', 'Rejected'].includes(out) ? 'MISSED' : 'OUTGOING');

      return {
        _id: c._id || c.id,
        id: c._id || c.id,
        source: 'call_log',
        provider: c.provider || 'manual',
        leadId: lead ? {
          _id: lead._id || lead.id,
          id: lead.id || lead._id,
          name: lead.name,
          leadId: lead.leadId,
          company: lead.company,
          phone: lead.phone,
          status: lead.status
        } : null,
        customerId: customer ? {
          _id: customer._id || customer.id,
          id: customer.id || customer._id,
          name: customer.name,
          customerId: customer.customerId,
          phone: customer.phone
        } : null,
        assignedTo: emp ? {
          _id: emp._id || emp.id,
          id: emp.id || emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email
        } : null,
        date: callDate,
        outcome: out,
        notes: c.notes,
        channelDetails: {
          callType,
          callDuration: c.duration || 0,
          simSlot: 1,
          phoneNumber: c.phoneNumber || lead?.phone || customer?.phone || '',
          contactName: lead?.name || customer?.name || '',
          deviceName: c.provider === 'manual' ? 'CRM Dialer / SIM' : (c.provider === 'sim_sync' ? 'Android SIM' : 'Mobile SIM'),
          source: c.provider || 'manual'
        }
      };
    });

    // 4. Normalize FollowUp records (deduplicate against CallLog by phone + timestamp window)
    const existingKeys = new Set(
      mappedCallLogs.map((l: any) => `${(l.channelDetails.phoneNumber || '').replace(/\D/g, '').slice(-10)}_${Math.floor(new Date(l.date).getTime() / 60000)}`)
    );

    const mappedFollowUps: any[] = [];
    for (const f of followUps) {
      const callDate = f.date || f.createdAt;
      const lead = f.leadId || f.lead;
      const customer = f.customerId || f.customer;
      const emp = f.assignedTo || f.assignee;
      const chDetails: any = (f.channelDetails as any) || {};
      const phone = chDetails.phoneNumber || lead?.phone || customer?.phone || '';
      const normPhone = (phone || '').replace(/\D/g, '').slice(-10);
      const key = `${normPhone}_${Math.floor(new Date(callDate).getTime() / 60000)}`;

      if (normPhone && existingKeys.has(key)) {
        continue; // skip duplicate call already present in CallLog
      }

      const out = f.outcome || chDetails.callOutcome || (f.status === 'completed' ? 'Connected' : 'Logged');
      const callType = chDetails.callType || (['Missed', 'Missed / Rejected', 'Rejected'].includes(out) ? 'MISSED' : 'OUTGOING');

      mappedFollowUps.push({
        _id: f._id || f.id,
        id: f._id || f.id,
        source: 'followup',
        provider: chDetails.source || 'android_sim_sync',
        leadId: lead ? {
          _id: lead._id || lead.id,
          id: lead.id || lead._id,
          name: lead.name,
          leadId: lead.leadId,
          company: lead.company,
          phone: lead.phone,
          status: lead.status
        } : null,
        customerId: customer ? {
          _id: customer._id || customer.id,
          id: customer.id || customer._id,
          name: customer.name,
          customerId: customer.customerId,
          phone: customer.phone
        } : null,
        assignedTo: emp ? {
          _id: emp._id || emp.id,
          id: emp.id || emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email
        } : null,
        date: callDate,
        outcome: out,
        notes: f.notes || f.purpose,
        channelDetails: {
          callType,
          callDuration: Number(chDetails.callDuration) || 0,
          simSlot: chDetails.simSlot || 1,
          phoneNumber: phone,
          contactName: chDetails.contactName || lead?.name || customer?.name || '',
          deviceName: chDetails.deviceName || 'Android SIM',
          source: chDetails.source || 'android_sim_sync'
        }
      });
    }

    // 5. Merge single-row lead call history, relational call logs, and follow-ups with deduplication
    const seenUnifiedKeys = new Set<string>();
    const unifiedLogs: any[] = [];

    for (const log of [...singleRowCallLogs, ...mappedCallLogs, ...mappedFollowUps]) {
      const phone = (log.channelDetails?.phoneNumber || log.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const timeMin = Math.floor(new Date(log.date).getTime() / 60000);
      const key = `${phone}_${timeMin}`;
      if (phone && seenUnifiedKeys.has(key)) {
        continue;
      }
      if (phone) seenUnifiedKeys.add(key);
      unifiedLogs.push(log);
    }

    unifiedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let finalLogs = unifiedLogs;
    if (!isPrivileged && userId) {
      finalLogs = unifiedLogs.filter((log: any) => {
        const lId = (log.leadId?._id || log.leadId?.id || (typeof log.leadId === 'string' ? log.leadId : '') || '').toString();
        // Only show call history matching active leads assigned to this employee
        return Boolean(lId && activeLeadIdSet.has(lId));
      });
    } else if (targetEmployeeId) {
      finalLogs = unifiedLogs.filter((log: any) => {
        const callerId = (log.assignedTo?._id || log.assignedTo?.id || '').toString();
        const lId = (log.leadId?._id || log.leadId?.id || (typeof log.leadId === 'string' ? log.leadId : '') || '').toString();
        return callerId === targetEmployeeId.toString() || Boolean(lId && activeLeadIdSet.has(lId));
      });
    }

    return res.json({
      success: true,
      data: finalLogs
    });
  } catch (error) {
    next(error);
  }
});

export default router;
