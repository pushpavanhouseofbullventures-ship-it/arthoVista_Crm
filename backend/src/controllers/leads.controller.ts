import { Request, Response, NextFunction } from 'express';
import { Lead, mongoose } from '../models';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';
import { Activity } from '../models/Activity';
import { Quotation } from '../models/Quotation';
import { AssignmentLog } from '../models/AssignmentLog';
import { LeadImportLog } from '../models/LeadImportLog';
import { UserOrganizationRole } from '../models/UserOrganizationRole';
import { Role } from '../models/Role';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { CallLog } from '../models/CallLog';
import { FollowUp } from '../models/FollowUp';
import { WorkflowService } from '../services/workflow.service';
import prisma from '../config/prisma';
import logger from '../utils/logger';

const PHONE_REGEX = /^\+?[0-9\s\-()]{10,18}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADMIN_EMAILS = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'];
const isMasterAdmin = (email?: string) => ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
const isSystemAdmin = (role?: string, email?: string) => ['Admin', 'Super Admin'].includes(role || '') || isMasterAdmin(email);

// Helper: Automatic Round Robin Lead Assignment (4-Level Hierarchy)
export async function assignLeadRoundRobin(organizationId: string): Promise<string | undefined> {
  try {
    const salesRoles = await Role.find({ 
      name: { $in: ['Admin', 'Super Admin', 'Manager', 'Team Leader', 'Sale Executive', 'Sales Executive', 'Employee'] }, 
      organizationId: null 
    });
    const roleIds = salesRoles.map(r => r._id);

    const teamMembers = await UserOrganizationRole.find({
      organizationId,
      roleId: { $in: roleIds }
    }).populate('userId', 'status');

    const activeRepIds = teamMembers
      .filter((tm: any) => tm.userId && tm.userId.status === 'active')
      .map((tm: any) => tm.userId._id.toString())
      .sort();

    if (activeRepIds.length === 0) return undefined;

    const lastAssignedLead = await Lead.findOne({
      organizationId,
      assignedTo: { $exists: true, $ne: null },
      isDeleted: false
    }).sort({ createdAt: -1 });

    if (!lastAssignedLead || !lastAssignedLead.assignedTo) {
      return activeRepIds[0];
    }

    const lastRepId = lastAssignedLead.assignedTo.toString();
    const lastIndex = activeRepIds.indexOf(lastRepId);
    const nextIndex = (lastIndex + 1) % activeRepIds.length;
    return activeRepIds[nextIndex];
  } catch (err) {
    logger.error('Round-robin assignment error:', err);
    return undefined;
  }
}

// 1. GET ALL LEADS (Paginated, Search, 4 Sub-Tabs, Unassigned filter, Role-based)
export async function getLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { 
      status, 
      priority, 
      source, 
      assignedTo, 
      search, 
      page = 1, 
      limit = 25, 
      unassignedOnly,
      myLeadsOnly,
      todayOnly,
      subStage,
      leadType
    } = req.query;

    const query: any = { organizationId: orgId, isDeleted: false };
    if (leadType === 'HR') {
      query.leadType = 'HR';
    } else if (!leadType) {
      query.leadType = { $ne: 'HR' };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const isTodayMode = todayOnly === 'true' || String(status).toLowerCase() === 'today' || String(status).toLowerCase() === 'today_assigned';

    // Role-based scoping (Core Hierarchy: Admin, Manager -> Privileged; Sale Executive -> Assigned leads)
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';

    if (!isPrivileged) {
      query.assignedTo = req.user?.id;
      if (unassignedOnly === 'true') {
        // Sale Executives do not have access to unassigned queue
        query.assignedTo = '__unauthorized_unassigned__';
      }
    } else if (myLeadsOnly === 'true') {
      query.assignedTo = req.user?.id;
    }

    // Filter by assigned employee
    if (assignedTo && isPrivileged) {
      query.assignedTo = assignedTo;
    }

    // Sub-tab status filter
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'today' || s === 'today_assigned') {
        const todayLogs = await AssignmentLog.find({
          organizationId: orgId,
          createdAt: { $gte: todayStart, $lte: todayEnd },
          ...(!isPrivileged ? { toUserId: req.user?.id } : (assignedTo ? { toUserId: assignedTo } : {}))
        });
        const assignedLeadIds = todayLogs.map(l => l.leadId).filter(Boolean);
        
        query.$or = [
          { status: { $in: ['New', 'new', 'NEW'] } },
          { createdAt: { $gte: todayStart, $lte: todayEnd } },
          { _id: { $in: assignedLeadIds } }
        ];
      } else if (s === 'open') {
        query.status = { $in: ['Open', 'open', 'OPEN', 'Contacted', 'contacted', 'Qualified', 'qualified', 'Proposal Sent', 'proposal sent', 'Negotiation', 'negotiation', 'In Process', 'in process', 'Follow-up', 'followup'] };
      } else if (s === 'new') {
        query.status = { $in: ['New', 'new', 'NEW'] };
      } else if (s === 'converted') {
        query.status = { $in: ['Converted', 'converted', 'CONVERTED'] };
      } else if (s === 'lost') {
        query.status = { $in: ['Lost', 'lost', 'LOST'] };
      } else if (s === 'everything' || s === 'all_statuses' || s === 'all' || s === 'leads') {
        // All leads across all statuses (all lead pipeline tracks)
      } else if (s === 'open' || s === 'active') {
        // Active Leads pipeline: strictly exclude Converted and Lost leads
        query.status = { $nin: ['Converted', 'converted', 'CONVERTED', 'Lost', 'lost', 'LOST'] };
      } else {
        query.status = status;
      }
    }

    // Sub-stage filter (In Process, Qualified, Proposal Sent, Negotiation), Lost Reason, & Converted Stages
    const activeSubStage = (subStage || leadType || (req.query as any).lostReason || (req.query as any).convertedStage) as string;
    if (activeSubStage && activeSubStage !== 'all') {
      const s = String(status).toLowerCase();
      if (s === 'lost') {
        if (activeSubStage === 'Other' || activeSubStage === 'other') {
          query.$or = [
            { lostReason: { $in: ['Other', 'other', ''] } },
            { lostReason: null },
            { lostReason: { $exists: false } }
          ];
        } else {
          query.lostReason = activeSubStage;
        }
      } else if (s === 'converted') {
        if (activeSubStage === 'Quotation Won') {
          query.$or = [
            { convertedQuotationId: { $ne: null } },
            { leadType: 'Quotation Won' }
          ];
        } else if (activeSubStage === 'Invoiced' || activeSubStage === 'Invoiced & Billed') {
          query.$or = [
            { convertedInvoiceId: { $ne: null } },
            { leadType: { $in: ['Invoiced', 'Invoiced & Billed'] } }
          ];
        } else if (activeSubStage === 'Direct Won') {
          query.$or = [
            { leadType: 'Direct Won' },
            {
              $and: [
                { convertedQuotationId: null },
                { convertedInvoiceId: null },
                { leadType: { $in: [null, '', 'Direct Won'] } }
              ]
            }
          ];
        } else {
          query.leadType = activeSubStage;
        }
      } else {
        if (activeSubStage === 'In Process' || activeSubStage === 'inprocess' || activeSubStage === 'in_process') {
          query.$or = [
            { leadType: { $in: ['In Process', 'inprocess', 'in_process', 'Inprocess'] } },
            { leadType: null },
            { leadType: '' },
            { leadType: { $exists: false } }
          ];
        } else {
          query.leadType = activeSubStage;
        }
      }
    }

    // Unassigned filter (Privileged Admins & Managers only)
    if (unassignedOnly === 'true' && isPrivileged) {
      query.assignedTo = { $in: [null, undefined] };
    }

    // Priority and Source filters
    if (priority) query.priority = priority;
    if (source) query.source = source;

    // Search query: phone (primary), name, company, email, leadId
    if (search) {
      const regex = new RegExp(search as string, 'i');
      const searchOr = [
        { phone: regex },
        { name: regex },
        { company: regex },
        { email: regex },
        { leadId: regex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const pageSize = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const skipIndex = (Number(page) - 1) * pageSize;

    const baseCountFilter: any = { 
      organizationId: orgId, 
      isDeleted: false,
      OR: [
        { leadType: null },
        { leadType: { not: 'HR' } }
      ]
    };
    if (!isPrivileged) {
      baseCountFilter.assignedTo = req.user?.id;
    }

    const todayLogsForCount = await AssignmentLog.find({
      organizationId: orgId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      ...(!isPrivileged ? { toUserId: req.user?.id } : {})
    });
    const todayAssignedIds = todayLogsForCount.map(l => l.leadId).filter(Boolean);
    const todayCountFilter: any = {
      organizationId: orgId,
      isDeleted: false,
      leadType: { $ne: 'HR' },
      ...(!isPrivileged ? { assignedTo: req.user?.id } : {}),
      $or: [
        { status: { $in: ['New', 'new', 'NEW'] } },
        { createdAt: { $gte: todayStart, $lte: todayEnd } },
        { _id: { $in: todayAssignedIds } }
      ]
    };

    // Auto-migrate any legacy removed sub-stages in open leads to 'In Process'
    await Lead.updateMany(
      { organizationId: orgId, leadType: { $in: ['Payment Expected', 'Payment Remaining', 'Negotiation', 'Payment'] } },
      { $set: { leadType: 'In Process' } }
    );

    // Parallel optimized fetching: query + total count + status breakdown + today count + open sub-stages + lost reasons + converted sub-stages in 1 parallel round-trip
    const [leads, total, statusGroups, unassignedCount, todayCount, openLeadsForSubStages, lostLeadsForReasons, convertedLeadsForStages] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('convertedQuotationId', 'quotationId totalAmount status')
        .populate('convertedInvoiceId', 'invoiceId totalAmount status outstandingBalance')
        .sort({ createdAt: -1 })
        .skip(skipIndex)
        .limit(pageSize),
      Lead.countDocuments(query),
      prisma.lead.groupBy({
        by: ['status'],
        where: baseCountFilter,
        _count: { _all: true }
      }),
      isPrivileged 
        ? prisma.lead.count({ 
            where: { 
              organizationId: orgId, 
              isDeleted: false, 
              assignedTo: null,
              OR: [{ leadType: null }, { leadType: { not: 'HR' } }]
            } 
          })
        : Promise.resolve(0),
      Lead.countDocuments(todayCountFilter),
      Lead.find({
        organizationId: orgId,
        isDeleted: false,
        leadType: { $ne: 'HR' },
        status: { $in: ['Open', 'open', 'OPEN', 'Contacted', 'contacted', 'Qualified', 'qualified', 'Proposal Sent', 'proposal sent', 'Negotiation', 'negotiation', 'In Process', 'in process', 'Follow-up', 'followup'] },
        ...(!isPrivileged ? { assignedTo: req.user?.id } : {})
      }),
      Lead.find({
        organizationId: orgId,
        isDeleted: false,
        leadType: { $ne: 'HR' },
        status: { $in: ['Lost', 'lost', 'LOST'] },
        ...(!isPrivileged ? { assignedTo: req.user?.id } : {})
      }),
      Lead.find({
        organizationId: orgId,
        isDeleted: false,
        leadType: { $ne: 'HR' },
        status: { $in: ['Converted', 'converted', 'CONVERTED'] },
        ...(!isPrivileged ? { assignedTo: req.user?.id } : {})
      })
    ]);

    let allCount = 0;
    let newCount = 0;
    let openCount = 0;
    let convertedCount = 0;
    let lostCount = 0;

    for (const g of (statusGroups || [])) {
      const count = g._count?._all || 0;
      allCount += count;
      const st = String(g.status || '').toLowerCase();
      if (st === 'new') newCount += count;
      else if (st === 'open' || st === 'contacted' || st === 'qualified' || st === 'proposal sent' || st === 'negotiation' || st === 'in process' || st === 'follow-up' || st === 'followup') openCount += count;
      else if (st === 'converted') convertedCount += count;
      else if (st === 'lost') lostCount += count;
      else openCount += count;
    }

    // Sub-stage breakdown for open leads
    const subStageCounts: Record<string, number> = {
      'In Process': 0,
      'Qualified': 0,
      'Proposal Sent': 0
    };

    for (const l of openLeadsForSubStages) {
      const stageKey = (l.leadType || 'In Process').trim();
      const sk = stageKey.toLowerCase();
      if (sk.includes('qualif')) {
        subStageCounts['Qualified']++;
      } else if (sk.includes('proposal') || sk.includes('send') || sk.includes('sent')) {
        subStageCounts['Proposal Sent']++;
      } else {
        subStageCounts['In Process']++;
      }
    }

    // Lost reasons breakdown for lost leads
    const lostReasonCounts: Record<string, number> = {
      'Price': 0,
      'No Response': 0,
      'Competitor': 0,
      'Not Interested': 0,
      'Other': 0
    };

    for (const l of lostLeadsForReasons) {
      const r = l.lostReason || 'Other';
      if (lostReasonCounts[r] !== undefined) {
        lostReasonCounts[r]++;
      } else if (r.toLowerCase().includes('price') || r.toLowerCase().includes('budget')) {
        lostReasonCounts['Price']++;
      } else if (r.toLowerCase().includes('response') || r.toLowerCase().includes('reach')) {
        lostReasonCounts['No Response']++;
      } else if (r.toLowerCase().includes('competitor')) {
        lostReasonCounts['Competitor']++;
      } else if (r.toLowerCase().includes('interest')) {
        lostReasonCounts['Not Interested']++;
      } else {
        lostReasonCounts['Other']++;
      }
    }

    // Converted sub-stages breakdown for converted leads (Direct Won, Quotation Won, Invoiced)
    const convertedStageCounts: Record<string, number> = {
      'Direct Won': 0,
      'Quotation Won': 0,
      'Invoiced': 0
    };

    for (const l of convertedLeadsForStages) {
      const hasInvoice = Array.isArray(l.convertedInvoiceId) ? l.convertedInvoiceId.length > 0 : Boolean(l.convertedInvoiceId);
      const hasQuotation = Array.isArray(l.convertedQuotationId) ? l.convertedQuotationId.length > 0 : Boolean(l.convertedQuotationId);
      const lt = (l.leadType || '').toLowerCase();

      if (hasInvoice || lt.includes('invoiced') || lt.includes('billed')) {
        convertedStageCounts['Invoiced']++;
      } else if (hasQuotation || lt === 'quotation won' || lt.includes('quotation')) {
        convertedStageCounts['Quotation Won']++;
      } else {
        convertedStageCounts['Direct Won']++;
      }
    }

    const enrichedLeads = leads.map((l: any) => {
      const leadObj = typeof l.toObject === 'function' ? l.toObject() : { ...l };
      const custom = (leadObj.customFields && typeof leadObj.customFields === 'object') ? leadObj.customFields : {};
      const expected = Number(custom.paymentExpected ?? leadObj.expectedValue ?? (leadObj.convertedQuotationId?.totalAmount) ?? (leadObj.convertedInvoiceId?.totalAmount) ?? 0);
      const completed = Number(custom.paymentReceived ?? (leadObj.convertedInvoiceId ? ((leadObj.convertedInvoiceId.totalAmount || 0) - (leadObj.convertedInvoiceId.outstandingBalance || 0)) : 0));
      const due = Math.max(0, expected - completed);
      return {
        ...leadObj,
        paymentExpected: expected,
        paymentReceived: completed,
        paymentDue: due
      };
    });

    return res.json({
      success: true,
      data: {
        leads: enrichedLeads,
        counts: {
          all: allCount,
          new: newCount,
          today: newCount > 0 ? newCount : todayCount,
          open: openCount,
          converted: convertedCount,
          lost: lostCount,
          unassigned: unassignedCount,
          subStages: subStageCounts,
          lostReasons: lostReasonCounts,
          convertedStages: convertedStageCounts
        },
        pagination: {
          total,
          page: Number(page),
          limit: pageSize,
          pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// 2. CHECK DUPLICATE LEAD PRE-FLIGHT
export async function checkDuplicateLead(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { phone, email, leadId } = req.body;

    const query: any = { organizationId: orgId, isDeleted: false };
    if (leadId) {
      query._id = { $ne: leadId };
    }

    let duplicateLead: any = null;
    let matchType = '';

    // Check Phone Match (Primary)
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone.length >= 7) {
        duplicateLead = await Lead.findOne({
          ...query,
          phone: { $regex: cleanPhone }
        }).populate('assignedTo', 'firstName lastName email');
        if (duplicateLead) matchType = 'phone';
      }
    }

    // Check Email Match (Secondary)
    if (!duplicateLead && email) {
      duplicateLead = await Lead.findOne({
        ...query,
        email: email.trim().toLowerCase()
      }).populate('assignedTo', 'firstName lastName email');
      if (duplicateLead) matchType = 'email';
    }

    return res.json({
      success: true,
      isDuplicate: !!duplicateLead,
      matchType,
      existingLead: duplicateLead
    });
  } catch (error) {
    next(error);
  }
}

// 3. GET SINGLE LEAD WITH TIMELINE & DETAILS
export async function getLead(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, isDeleted: false })
      .populate('assignedTo', 'firstName lastName email')
      .populate('reopenedBy', 'firstName lastName email')
      .populate('convertedBy', 'firstName lastName email')
      .populate('convertedQuotationId')
      .populate('convertedInvoiceId');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
        errorCode: 'LEAD_NOT_FOUND'
      });
    }

    // Scoping check for non-privileged employee
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    const assignedId = (typeof lead.assignedTo === 'object' && lead.assignedTo) ? ((lead.assignedTo as any)._id || (lead.assignedTo as any).id)?.toString() : lead.assignedTo?.toString();
    if (!isPrivileged && (!assignedId || assignedId !== req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view leads assigned to you.',
        errorCode: 'FORBIDDEN'
      });
    }

    // Fetch activities / timeline logs
    const activities = await Activity.find({ leadId: lead._id, organizationId: orgId })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Also fetch CallLogs for this lead to ensure calls by previous or current employees are maintained
    const callLogs = await CallLog.find({ leadId: lead._id, organizationId: orgId })
      .populate('employeeId', 'firstName lastName email')
      .sort({ startTime: -1, createdAt: -1 });

    const existingCallTimestamps = new Set(
      activities
        .filter((a: any) => a.type === 'call' || a.type === 'phone')
        .map((a: any) => Math.floor(new Date(a.createdAt).getTime() / 60000))
    );

    const syntheticCallActivities: any[] = [];
    for (const c of callLogs) {
      const callDate = c.startTime || c.createdAt;
      const minKey = Math.floor(new Date(callDate).getTime() / 60000);
      if (!existingCallTimestamps.has(minKey)) {
        const emp = c.employeeId as any;
        const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'Sales Agent';
        syntheticCallActivities.push({
          _id: c._id || c.id,
          id: c._id || c.id,
          organizationId: orgId,
          leadId: lead._id,
          userId: emp ? {
            _id: emp._id || emp.id,
            id: emp._id || emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email
          } : null,
          type: 'call',
          content: `📱 Phone Call (${c.direction === 'inbound' ? 'INCOMING' : 'OUTGOING'}): ${c.duration || 0}s duration. Outcome: ${c.outcome || 'Connected'}.${c.notes ? `\nNotes: "${c.notes}"` : ''} Logged by ${empName}.`,
          metadata: {
            channel: 'phone',
            duration: c.duration || 0,
            outcome: c.outcome || 'Connected',
            callType: c.direction === 'inbound' ? 'INCOMING' : 'OUTGOING',
            phoneNumber: c.phoneNumber,
            source: c.provider || 'manual'
          },
          createdAt: callDate,
          updatedAt: callDate
        });
      }
    }

    const mergedActivities = [...activities, ...syntheticCallActivities].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Fetch linked quotations
    const quotations = await Quotation.find({ leadId: lead._id, organizationId: orgId, isDeleted: false })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Fetch assignment logs
    const assignmentLogs = await AssignmentLog.find({ leadId: lead._id, organizationId: orgId })
      .populate('assignedBy', 'firstName lastName')
      .populate('fromUserId', 'firstName lastName')
      .populate('toUserId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const leadObj = typeof lead.toObject === 'function' ? lead.toObject() : { ...lead };
    const custom = (leadObj.customFields && typeof leadObj.customFields === 'object') ? leadObj.customFields : {};
    const expected = Number(custom.paymentExpected ?? leadObj.expectedValue ?? (leadObj.convertedQuotationId?.totalAmount) ?? (leadObj.convertedInvoiceId?.totalAmount) ?? 0);
    const completed = Number(custom.paymentReceived ?? (leadObj.convertedInvoiceId ? ((leadObj.convertedInvoiceId.totalAmount || 0) - (leadObj.convertedInvoiceId.outstandingBalance || 0)) : 0));
    const due = Math.max(0, expected - completed);
    leadObj.paymentExpected = expected;
    leadObj.paymentReceived = completed;
    leadObj.paymentDue = due;

    return res.json({
      success: true,
      data: {
        lead: leadObj,
        activities: mergedActivities,
        quotations,
        assignmentLogs
      }
    });
  } catch (error) {
    next(error);
  }
}

// 4. CREATE LEAD (Manual Quick-Add)
export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Sale Executives cannot create leads directly. Only Admins and Managers have permission.',
        errorCode: 'FORBIDDEN_CANNOT_CREATE_LEAD'
      });
    }

    const orgId = req.organizationId;
    const userId = req.user?.id;
    const {
      name,
      company,
      email,
      phone,
      whatsApp,
      alternatePhone,
      source = 'Website',
      serviceInterested,
      productInterested,
      priority = 'medium',
      assignedTo,
      notes,
      tags,
      nextFollowUp,
      expectedValue,
      force = false
    } = req.body;

    // Validate name & phone (Required)
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Lead name is required.',
        errorCode: 'NAME_REQUIRED'
      });
    }

    if (!phone || !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid phone number (at least 10 digits) is required.',
        errorCode: 'INVALID_PHONE'
      });
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
        errorCode: 'INVALID_EMAIL'
      });
    }

    // Duplicate check if force flag is false
    if (!force) {
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      const existing = await Lead.findOne({
        organizationId: orgId,
        isDeleted: false,
        $or: [
          { phone: { $regex: cleanPhone } },
          ...(email ? [{ email: email.trim().toLowerCase() }] : [])
        ]
      }).populate('assignedTo', 'firstName lastName');

      if (existing) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: `A lead with this phone/email already exists (#${existing.leadId} - ${existing.name}).`,
          existingLead: existing,
          errorCode: 'DUPLICATE_LEAD'
        });
      }
    }

    // Initial status determined by assignment:
    // If assignedTo is set, status is 'Open'; if not assigned, status is 'New' (sits in Unassigned queue)
    let assignedUserId = assignedTo || undefined;
    let initialStatus: 'New' | 'Open' = assignedUserId ? 'Open' : 'New';

    const newLead = await Lead.create({
      organizationId: orgId,
      name: name.trim(),
      company: company?.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone.trim(),
      whatsApp: whatsApp?.trim() || phone.trim(),
      alternatePhone: alternatePhone?.trim(),
      source,
      serviceInterested,
      productInterested,
      priority,
      status: initialStatus,
      assignedTo: assignedUserId,
      expectedValue: Number(expectedValue) || 0,
      notes,
      tags: Array.isArray(tags) ? tags : [],
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined
    });

    // Timeline creation activity
    await Activity.create({
      organizationId: orgId,
      leadId: newLead._id,
      userId,
      type: 'system',
      content: `Lead #${newLead.leadId} created via ${source}.`
    });

    // Assignment log if assigned
    if (assignedUserId) {
      await AssignmentLog.create({
        organizationId: orgId,
        leadId: newLead._id,
        assignedBy: userId,
        toUserId: assignedUserId,
        ruleApplied: 'manual_admin',
        reason: 'Assigned on lead creation.'
      });

      await Activity.create({
        organizationId: orgId,
        leadId: newLead._id,
        userId,
        type: 'assignment_change',
        content: `Lead assigned to sales agent.`,
        metadata: { assignedTo: assignedUserId }
      });
    }

    // Trigger workflows
    await WorkflowService.triggerWorkflows(orgId as string, 'lead_created', newLead);

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      data: newLead
    });
  } catch (error) {
    next(error);
  }
}

// 5. UPDATE LEAD (Strict State Machine: New -> Open -> (Converted | Lost))
export async function updateLead(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const updates = req.body;

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
        errorCode: 'LEAD_NOT_FOUND'
      });
    }

    // Scoping check for non-privileged employee
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    const assignedId = (typeof lead.assignedTo === 'object' && lead.assignedTo) ? ((lead.assignedTo as any)._id || (lead.assignedTo as any).id)?.toString() : lead.assignedTo?.toString();
    if (!isPrivileged && (!assignedId || assignedId !== req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update leads assigned to you.',
        errorCode: 'FORBIDDEN'
      });
    }

    if (!isPrivileged && updates.assignedTo) {
      delete updates.assignedTo;
    }

    // 0. Permission Check: Once filled, standard employees cannot edit 'paymentExpected' or 'expectedValue'
    const rawExistingCustom = lead.customFields;
    const existingCustom: Record<string, any> = (rawExistingCustom && typeof rawExistingCustom === 'object' && !Array.isArray(rawExistingCustom))
      ? { ...(rawExistingCustom as Record<string, any>) }
      : {};
    const existingExpected = Number(existingCustom.paymentExpected ?? lead.expectedValue ?? 0);

    if (!isPrivileged && existingExpected > 0) {
      if (updates.paymentExpected !== undefined && Number(updates.paymentExpected) !== existingExpected) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Once Payment Expected has been filled (₹${existingExpected.toLocaleString('en-IN')}), standard employees cannot edit it. Only Admins can modify Expected Payment. You can still record Payment Received.`,
          errorCode: 'PAYMENT_EXPECTED_LOCKED'
        });
      }
      if (updates.expectedValue !== undefined && Number(updates.expectedValue) !== existingExpected) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Once Payment Expected has been filled (₹${existingExpected.toLocaleString('en-IN')}), standard employees cannot edit it. Only Admins can modify Expected Payment.`,
          errorCode: 'PAYMENT_EXPECTED_LOCKED'
        });
      }
    }

    let statusTransitionLoggedNotes = false;

    // 1. Workflow State Machine & Admin Position Dispatch
    if (updates.status && updates.status !== lead.status) {
      // If previously converted, non-privileged standard employees cannot edit without admin override/reason
      if (lead.status === 'Converted' && !isPrivileged && !updates.adminOverrideReason && !updates.reason) {
        return res.status(400).json({
          success: false,
          message: `This lead is marked as "Converted" and is locked from direct status edits. Admin must use the "Reopen Lead" or dispatch action.`,
          errorCode: 'LEAD_LOCKED'
        });
      }

      // Moving from New -> Open requires assigned employee for standard employees
      if (updates.status === 'Open' && !lead.assignedTo && !updates.assignedTo && !isPrivileged) {
        return res.status(400).json({
          success: false,
          message: 'An assigned employee is required before moving a lead from "New" to "Open".',
          errorCode: 'ASSIGNMENT_REQUIRED'
        });
      }

      // Moving from Lost to active pipeline (Reopen / Dispatch)
      if (lead.status === 'Lost' && (updates.status === 'Open' || updates.status === 'New')) {
        lead.lostReason = null;
        lead.lostNotes = null;
        lead.reopenedAt = new Date();
        lead.reopenedBy = userId as any;
        lead.reopenedReason = updates.transitionNotes || updates.notes || 'Dispatched back to active pipeline';
      }

      // Moving to New (Reset / Fresh Pipeline)
      if (updates.status === 'New') {
        lead.lostReason = null;
        lead.lostNotes = null;
        lead.convertedAt = null;
        lead.convertedBy = null;
        lead.convertedQuotationId = null;
      }

      // Moving to Open (Reactivate / Active Pipeline)
      if (updates.status === 'Open') {
        lead.lostReason = null;
        lead.lostNotes = null;
        lead.convertedAt = null;
        lead.convertedBy = null;
        lead.convertedQuotationId = null;
      }

      // Moving to Lost
      if (updates.status === 'Lost') {
        if (!isPrivileged && (!updates.lostReason || !['Price', 'No Response', 'Competitor', 'Not Interested', 'Other'].includes(updates.lostReason))) {
          return res.status(400).json({
            success: false,
            message: 'A valid "Reason for Loss" (Price, No Response, Competitor, Not Interested, Other) is mandatory when marking a lead as Lost.',
            errorCode: 'LOST_REASON_REQUIRED'
          });
        }
        lead.lostReason = updates.lostReason || 'Other';
        lead.lostNotes = updates.lostNotes || (isPrivileged ? 'Dispatched to Lost by Admin' : '');
        lead.convertedAt = null;
        lead.convertedBy = null;
        lead.convertedQuotationId = null;
        lead.leadType = null;
      }

      // Moving to Converted
      if (updates.status === 'Converted') {
        // Validation: Required payment expected when moving into Converted from another stage
        if (lead.status !== 'Converted') {
          const expectedInput = updates.paymentExpected !== undefined
            ? Number(updates.paymentExpected)
            : (updates.expectedValue !== undefined ? Number(updates.expectedValue) : Number(lead.expectedValue || (lead.customFields as any)?.paymentExpected || 0));

          if (!expectedInput || expectedInput <= 0) {
            return res.status(400).json({
              success: false,
              requiresPaymentExpected: true,
              message: 'Payment Expected amount is required when moving a lead to the Converted stage.',
              errorCode: 'PAYMENT_EXPECTED_REQUIRED'
            });
          }
        }

        const acceptedQuote = await Quotation.findOne({
          leadId: lead._id,
          organizationId: orgId,
          status: { $in: ['accepted', 'converted'] },
          isDeleted: false
        });

        if (!acceptedQuote && !updates.adminOverrideReason && !isPrivileged) {
          return res.status(400).json({
            success: false,
            requiresQuotationOverride: true,
            message: 'A lead can only be converted after at least one Quotation with status "Accepted" exists against it. If you wish to override, provide a confirmation reason.',
            errorCode: 'ACCEPTED_QUOTATION_REQUIRED'
          });
        }

        lead.convertedAt = new Date();
        lead.convertedBy = userId as any;
        lead.lostReason = null;
        lead.lostNotes = null;
        if (acceptedQuote) {
          lead.convertedQuotationId = acceptedQuote._id as any;
        }
      }

      // Log status transition in timeline
      const transitionReason = updates.lostReason ? ` (Reason: ${updates.lostReason})` : updates.adminOverrideReason ? ` (Override: ${updates.adminOverrideReason})` : '';
      const transitionNote = updates.transitionNotes || updates.notes;
      const noteSuffix = transitionNote ? `\n\n📝 Discussion / Handoff Summary:\n"${transitionNote}"` : '';
      if (transitionNote) {
        statusTransitionLoggedNotes = true;
      }
      await Activity.create({
        organizationId: orgId,
        leadId: lead._id,
        userId,
        type: 'status_change',
        content: `Workflow stage dispatched from "${lead.status}" to "${updates.status}"${isPrivileged ? ' by Admin' : ''}.${transitionReason}${noteSuffix}`,
        metadata: { oldStatus: lead.status, newStatus: updates.status, lostReason: updates.lostReason, isPrivileged, notes: transitionNote }
      });

      lead.status = updates.status;
    }

    // 2. Track Assignment Changes
    if (updates.assignedTo && lead.assignedTo?.toString() !== updates.assignedTo) {
      const oldRep = lead.assignedTo;
      lead.assignedTo = updates.assignedTo;

      // Auto move from New to Open upon assignment
      if (lead.status === 'New') {
        lead.status = 'Open';
      }

      const assignedUser = await User.findById(updates.assignedTo);
      const repName = assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Sales Agent';

      let oldRepName = '';
      if (oldRep) {
        const oldUser = await User.findById(oldRep);
        if (oldUser) oldRepName = `${oldUser.firstName} ${oldUser.lastName}`;
      }

      await AssignmentLog.create({
        organizationId: orgId,
        leadId: lead._id,
        assignedBy: userId,
        fromUserId: oldRep,
        toUserId: updates.assignedTo,
        ruleApplied: 'manual_reassign',
        reason: updates.assignmentReason || (oldRepName ? `Reassigned from ${oldRepName} to ${repName}` : `Assigned to ${repName}`)
      });

      const reassignmentContent = oldRepName
        ? `Lead reassigned from ${oldRepName} to ${repName} by Admin. All past activities, notes, and call records of ${oldRepName} are preserved.`
        : `Lead assigned to ${repName} by Admin.`;

      await Activity.create({
        organizationId: orgId,
        leadId: lead._id,
        userId,
        type: 'assignment_change',
        content: reassignmentContent,
        metadata: { fromRep: oldRep, toRep: updates.assignedTo, fromRepName: oldRepName, toRepName: repName }
      });

      // Maintain past activities and completed follow-ups intact with original employee!
      // Safely transfer pending follow-ups to the new assignee so upcoming scheduled calls are not missed
      await FollowUp.updateMany(
        { leadId: lead._id, organizationId: orgId, status: 'pending' },
        { assignedTo: updates.assignedTo }
      );
    }

    // 3. Update fields
    if (updates.name) lead.name = updates.name.trim();
    if (updates.company !== undefined) lead.company = updates.company;
    if (updates.email !== undefined) lead.email = updates.email?.trim().toLowerCase();
    if (updates.phone) lead.phone = updates.phone.trim();
    if (updates.whatsApp !== undefined) lead.whatsApp = updates.whatsApp;
    if (updates.alternatePhone !== undefined) lead.alternatePhone = updates.alternatePhone;
    if (updates.source) lead.source = updates.source;
    if (updates.serviceInterested !== undefined) lead.serviceInterested = updates.serviceInterested;
    if (updates.productInterested !== undefined) lead.productInterested = updates.productInterested;
    if (updates.priority) lead.priority = updates.priority;
    if (updates.expectedValue !== undefined) lead.expectedValue = Number(updates.expectedValue);
    if (updates.location !== undefined) lead.location = updates.location;
    if (updates.tags) lead.tags = updates.tags;
    if (updates.lostReason !== undefined) lead.lostReason = updates.lostReason;
    if (updates.lostNotes !== undefined) lead.lostNotes = updates.lostNotes;
    if (updates.nextFollowUp !== undefined) lead.nextFollowUp = updates.nextFollowUp ? new Date(updates.nextFollowUp) : null;
    if (updates.lastFollowUpDate !== undefined) lead.lastFollowUpDate = updates.lastFollowUpDate ? new Date(updates.lastFollowUpDate) : null;

    // Payment Tracking: paymentExpected & paymentReceived
    if (updates.paymentExpected !== undefined || updates.paymentReceived !== undefined) {
      const rawCustom = lead.customFields;
      const custom: Record<string, any> = (rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom))
        ? { ...(rawCustom as Record<string, any>) }
        : {};
      const oldReceived = Number(custom.paymentReceived ?? 0);

      if (updates.paymentExpected !== undefined) {
        const exp = Math.max(0, Number(updates.paymentExpected) || 0);
        custom.paymentExpected = exp;
        lead.expectedValue = exp;
      }
      if (updates.paymentReceived !== undefined) {
        const rec = Math.max(0, Number(updates.paymentReceived) || 0);
        custom.paymentReceived = rec;
      }

      const totalExp = Number(custom.paymentExpected ?? lead.expectedValue ?? 0);
      const totalRec = Number(custom.paymentReceived ?? 0);
      const calculatedDue = Math.max(0, totalExp - totalRec);
      custom.paymentDue = calculatedDue;
      lead.customFields = custom;

      if (updates.paymentReceived !== undefined && oldReceived !== totalRec) {
        await Activity.create({
          organizationId: orgId,
          leadId: lead._id,
          userId,
          type: 'payment_update',
          content: `Payment collection updated: Completed ₹${totalRec.toLocaleString('en-IN')}, Remaining Due: ₹${calculatedDue.toLocaleString('en-IN')}.`,
          metadata: { paymentExpected: totalExp, paymentReceived: totalRec, paymentDue: calculatedDue }
        });
      }
    }

    // Track sub-stage (In Process, Qualified, Proposal Sent, Negotiation, Direct Won, Quotation Won, Invoiced)
    if (updates.subStage !== undefined || updates.leadType !== undefined) {
      const newSubStage = updates.subStage || updates.leadType;

      // Strict Rule: Leads can only go to Invoiced when payment due is <= 0
      if (newSubStage === 'Invoiced' || newSubStage === 'Invoiced & Billed') {
        const rawCustom = lead.customFields;
        const custom: Record<string, any> = (rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom))
          ? { ...(rawCustom as Record<string, any>) }
          : {};
        const totalExp = Number(updates.paymentExpected !== undefined ? updates.paymentExpected : (custom.paymentExpected ?? lead.expectedValue ?? 0));
        const totalRec = Number(updates.paymentReceived !== undefined ? updates.paymentReceived : (custom.paymentReceived ?? 0));
        const due = Math.max(0, totalExp - totalRec);

        if (due > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot move lead to Invoiced: Outstanding payment due is ₹${due.toLocaleString('en-IN')}. Payment due must be ₹0 or less before moving to Invoiced.`,
            errorCode: 'PAYMENT_DUE_NOT_ZERO'
          });
        }
      }

      const oldSubStage = lead.leadType || 'In Process';
      lead.leadType = newSubStage;
      if (oldSubStage !== newSubStage) {
        const transitionNote = updates.transitionNotes || updates.notes;
        const noteSuffix = (transitionNote && !statusTransitionLoggedNotes) ? `\n\n📝 Discussion / Handoff Summary:\n"${transitionNote}"` : '';
        await Activity.create({
          organizationId: orgId,
          leadId: lead._id,
          userId,
          type: 'status_change',
          content: `Sub-pipeline stage transitioned from "${oldSubStage}" to "${newSubStage}".${noteSuffix}`,
          metadata: { oldSubStage, newSubStage, notes: transitionNote }
        });
      }
    }

    // Track note addition
    if (updates.notes && lead.notes !== updates.notes) {
      lead.notes = updates.notes;
      await Activity.create({
        organizationId: orgId,
        leadId: lead._id,
        userId,
        type: 'note',
        content: updates.notes
      });
    }

    lead.version = (lead.version || 1) + 1;
    await lead.save();

    const leadObj = typeof lead.toObject === 'function' ? lead.toObject() : { ...lead };
    const custom = (leadObj.customFields && typeof leadObj.customFields === 'object') ? leadObj.customFields : {};
    leadObj.paymentExpected = Number(custom.paymentExpected ?? leadObj.expectedValue ?? 0);
    leadObj.paymentReceived = Number(custom.paymentReceived ?? 0);
    leadObj.paymentDue = Math.max(0, leadObj.paymentExpected - leadObj.paymentReceived);

    return res.json({
      success: true,
      message: 'Lead updated successfully.',
      data: leadObj
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reopen a previously Closed (Won/Lost/Converted) Lead
 */
export async function reopenLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const orgId = req.organizationId;
    const userId = req.user?.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory reason is required to reopen a closed lead.',
        errorCode: 'REOPEN_REASON_REQUIRED'
      });
    }

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const prevStatus = lead.status;
    lead.status = 'Open';
    lead.reopenedAt = new Date();
    lead.reopenedBy = userId as any;
    lead.reopenedReason = reason.trim();
    lead.lostReason = null;
    lead.lostNotes = null;

    await lead.save();

    await Activity.create({
      organizationId: orgId,
      leadId: lead._id,
      userId,
      type: 'status_change',
      content: `Lead reopened from "${prevStatus}" to "Open". Reason: "${reason.trim()}".`,
      metadata: { prevStatus, reopenReason: reason }
    });

    return res.json({
      success: true,
      message: 'Lead reopened successfully.',
      data: lead
    });
  } catch (error) {
    next(error);
  }
}

// 7. ASSIGN / REASSIGN LEADS (Admin Single & Bulk)
export async function assignLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { leadIds, assignedTo, reason = 'Admin Assignment' } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Valid lead IDs array and target employee ID required.',
        errorCode: 'BAD_REQUEST'
      });
    }

    const targetUser = await User.findById(assignedTo);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Assigned employee not found.' });
    }
    const repName = `${targetUser.firstName} ${targetUser.lastName}`;

    const leads = await Lead.find({ _id: { $in: leadIds }, organizationId: orgId, isDeleted: false });

    for (const lead of leads) {
      const oldRep = lead.assignedTo;
      if (oldRep && oldRep.toString() === assignedTo.toString()) {
        continue; // Already assigned to this representative
      }
      lead.assignedTo = assignedTo;
      if (lead.status === 'New') {
        lead.status = 'Open';
      }
      if ((lead as any).save) await (lead as any).save();

      let oldRepName = '';
      if (oldRep) {
        const oldUser = await User.findById(oldRep);
        if (oldUser) oldRepName = `${oldUser.firstName} ${oldUser.lastName}`;
      }

      await AssignmentLog.create({
        organizationId: orgId,
        leadId: lead._id,
        assignedBy: userId,
        fromUserId: oldRep,
        toUserId: assignedTo,
        ruleApplied: 'manual_admin',
        reason: reason || (oldRepName ? `Reassigned from ${oldRepName} to ${repName}` : `Assigned to ${repName}`)
      });

      const assignmentContent = oldRepName
        ? `Lead reassigned from ${oldRepName} to ${repName} by Admin. All past activities, notes, and call records of ${oldRepName} are preserved.`
        : `Lead assigned to ${repName} by Admin.`;

      await Activity.create({
        organizationId: orgId,
        leadId: lead._id,
        userId,
        type: 'assignment_change',
        content: assignmentContent,
        metadata: { fromRep: oldRep, toRep: assignedTo, fromRepName: oldRepName, toRepName: repName }
      });

      // Maintain past activities and completed follow-ups intact with original employee!
      // Safely transfer pending follow-ups to the new assignee so upcoming scheduled calls are not missed
      await FollowUp.updateMany(
        { leadId: lead._id, organizationId: orgId, status: 'pending' },
        { assignedTo }
      );
    }

    return res.json({
      success: true,
      message: `Successfully assigned ${leads.length} lead(s) to ${repName}.`
    });
  } catch (error) {
    next(error);
  }
}

// 8. BULK ACTIONS (Status, Tag, Delete)
export async function bulkUpdateLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { leadIds, status, tag, action } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid lead IDs array required.',
        errorCode: 'BAD_REQUEST'
      });
    }

    const filter: any = { _id: { $in: leadIds }, organizationId: orgId };
    const update: any = {};

    if (action === 'status' && status) {
      update.status = status;
    } else if (action === 'add_tag' && tag) {
      update.$addToSet = { tags: tag };
    } else if (action === 'delete') {
      update.isDeleted = true;
    }

    await Lead.updateMany(filter, update);

    return res.json({
      success: true,
      message: `Bulk operation ${action} executed successfully.`
    });
  } catch (error) {
    next(error);
  }
}

// 9. BULK EXCEL / CSV UPLOAD PROCESSOR
export async function bulkUploadLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admins and Managers are permitted to bulk upload leads.',
        errorCode: 'FORBIDDEN'
      });
    }

    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { rows, fileName = 'leads_import.csv', fileSize = 1024, duplicateStrategy = 'preview' } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data rows provided for upload.',
        errorCode: 'EMPTY_FILE'
      });
    }

    const errors: any[] = [];
    const duplicates: any[] = [];
    const successfulLeads: any[] = [];

    // Process row-by-row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // header is row 1
      const row = rows[i];

      const name = (row.name || row.Name || row['Full Name'] || '').trim();
      const phone = (row.phone || row.Phone || row['Phone Number'] || row.Mobile || '').toString().trim();
      const email = (row.email || row.Email || '').toString().trim().toLowerCase();
      const company = (row.company || row.Company || row['Company Name'] || '').toString().trim();
      const source = (row.source || row.Source || 'Website').toString().trim();
      const serviceInterested = (row.serviceInterested || row['Service Interested'] || row.Service || '').toString().trim();
      const notes = (row.notes || row.Notes || '').toString().trim();

      // Validate required name
      if (!name) {
        errors.push({ rowNumber: rowNum, phone, email, name: name || 'Empty', reason: 'Missing lead name' });
        continue;
      }

      // Validate required phone
      if (!phone || !PHONE_REGEX.test(phone)) {
        errors.push({ rowNumber: rowNum, phone: phone || 'Empty', email, name, reason: 'Invalid or missing phone number (min 10 digits required)' });
        continue;
      }

      // Validate email format if provided
      if (email && !EMAIL_REGEX.test(email)) {
        errors.push({ rowNumber: rowNum, phone, email, name, reason: 'Invalid email address format' });
        continue;
      }

      // Duplicate Check
      const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      const existingMatch = await Lead.findOne({
        organizationId: orgId,
        isDeleted: false,
        $or: [
          { phone: { $regex: cleanPhone } },
          ...(email ? [{ email }] : [])
        ]
      });

      if (existingMatch) {
        duplicates.push({
          rowNumber: rowNum,
          phone,
          email,
          name,
          existingLeadId: existingMatch.leadId,
          resolution: duplicateStrategy === 'skip' ? 'skipped' : duplicateStrategy === 'create_new' ? 'created_new' : 'pending'
        });

        if (duplicateStrategy === 'skip' || duplicateStrategy === 'preview') {
          continue;
        }
      }

      // If valid, create lead in 'New' state
      const created = await Lead.create({
        organizationId: orgId,
        name,
        company,
        phone,
        email: email || undefined,
        whatsApp: phone,
        source: ['Website', 'WhatsApp', 'Email', 'JustDial', 'IndiaMART', 'Referral', 'Walk-in', 'Phone', 'Manual', 'Other'].includes(source) ? source : 'Other',
        serviceInterested,
        status: 'New',
        notes
      });

      successfulLeads.push(created);
    }

    // Save Raw Upload Log (30-day retention)
    const importLog = await LeadImportLog.create({
      organizationId: orgId,
      importedBy: userId,
      fileName,
      fileSize,
      totalRows: rows.length,
      successfulRows: successfulLeads.length,
      failedRows: errors.length,
      duplicateRows: duplicates.length,
      rowErrors: errors,
      duplicates,
      status: 'completed'
    });

    return res.json({
      success: true,
      message: `Processed ${rows.length} rows: ${successfulLeads.length} imported, ${duplicates.length} duplicates flagged, ${errors.length} failed.`,
      data: {
        importLogId: importLog._id,
        totalRows: rows.length,
        successfulCount: successfulLeads.length,
        failedCount: errors.length,
        duplicateCount: duplicates.length,
        errors,
        duplicates
      }
    });
  } catch (error) {
    next(error);
  }
}

// 10. DOWNLOAD BULK TEMPLATE CSV
export function getBulkTemplate(req: Request, res: Response) {
  const userRole = (req as any).userRole;
  const isPrivileged = isSystemAdmin(userRole, (req as any).user?.email) || userRole === 'Manager';
  if (!isPrivileged) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Admins and Managers can download the bulk template.',
      errorCode: 'FORBIDDEN'
    });
  }

  const headers = 'Name,Company,Phone,Email,Source,ServiceInterested,ExpectedValue,Notes\n';
  const sample1 = 'Rahul Sharma,Apex Enterprises,9876543210,rahul@apex.com,IndiaMART,Business Loan,150000,Interested in quick sanction\n';
  const sample2 = 'Priya Patel,Innovatech Solutions,9811223344,priya@innovatech.com,JustDial,GST Registration,25000,Requires filing assistance\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads_bulk_template.csv"');
  return res.send(headers + sample1 + sample2);
}

// 11. GET ASSIGNMENT AUDIT LOGS
export async function getAssignmentLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userRole = (req as any).userRole;
    const isAdmin = isSystemAdmin(userRole, req.user?.email);
    const { page = 1, limit = 50 } = req.query;

    const skipIndex = (Number(page) - 1) * Number(limit);

    const logs = await AssignmentLog.find({ organizationId: orgId })
      .populate('leadId', 'name leadId company phone status')
      .populate('assignedBy', 'firstName lastName email')
      .populate('fromUserId', 'firstName lastName email')
      .populate('toUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(Number(limit));

    const total = await AssignmentLog.countDocuments({ organizationId: orgId });

    // If requester is not Admin, mask Admin profile in logs
    let sanitizedLogs = logs;
    if (!isAdmin) {
      const superAdminRole = await Role.findOne({ name: { $in: ['Super Admin', 'Admin'] }, organizationId: null });
      const superAdminMemberships = superAdminRole ? await UserOrganizationRole.find({ roleId: superAdminRole._id }) : [];
      const superAdminUserIds = new Set(superAdminMemberships.map((m: any) => m.userId?.toString()));

      sanitizedLogs = logs.map((log: any) => {
        const logObj = log.toObject ? log.toObject() : { ...log };
        if (logObj.assignedBy && superAdminUserIds.has(logObj.assignedBy._id?.toString())) {
          logObj.assignedBy = { _id: logObj.assignedBy._id, firstName: 'System', lastName: 'Admin', email: '' };
        }
        if (logObj.fromUserId && superAdminUserIds.has(logObj.fromUserId._id?.toString())) {
          logObj.fromUserId = { _id: logObj.fromUserId._id, firstName: 'System', lastName: 'Admin', email: '' };
        }
        if (logObj.toUserId && superAdminUserIds.has(logObj.toUserId._id?.toString())) {
          logObj.toUserId = { _id: logObj.toUserId._id, firstName: 'System', lastName: 'Admin', email: '' };
        }
        return logObj;
      });
    }

    return res.json({
      success: true,
      data: {
        logs: sanitizedLogs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

// 12. GET IMPORT HISTORY LOGS (30-day raw logs)
export async function getImportLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = (req as any).userRole;
    const isAuthorized = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admins and Managers can view import logs.',
        errorCode: 'FORBIDDEN'
      });
    }

    const orgId = req.organizationId;
    const logs = await LeadImportLog.find({ organizationId: orgId })
      .populate('importedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
}

// 13. DELETE LEAD (Soft Delete)
export async function deleteLead(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;

    const lead = await Lead.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    await AuditLog.create({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'LEAD_DELETED',
      entity: 'Lead',
      entityId: id
    });

    return res.json({
      success: true,
      message: 'Lead deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// 14. CONVERT LEAD TO CUSTOMER (ACID Transaction)
export async function convertLead(req: Request, res: Response, next: NextFunction) {
  const orgId = req.organizationId;
  const userId = req.user?.id;
  const { leadId, force = false, linkCustomerId } = req.body;

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const lead = await Lead.findOne({ _id: leadId, organizationId: orgId, isDeleted: false }).session(mongoSession);
    if (!lead) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    let customer: any = null;

    if (linkCustomerId) {
      customer = await Customer.findOne({ _id: linkCustomerId, organizationId: orgId }).session(mongoSession);
    } else {
      const [newCust] = await Customer.create(
        [
          {
            organizationId: orgId,
            name: lead.name,
            companyName: lead.company,
            email: lead.email || `contact_${Date.now()}@temp.com`,
            phone: lead.phone,
            whatsApp: lead.whatsApp,
            notes: lead.notes,
            outstandingBalance: 0
          }
        ],
        { session: mongoSession }
      );
      customer = newCust;

      await Contact.create(
        [
          {
            organizationId: orgId,
            customerId: customer._id,
            firstName: lead.name.split(' ')[0],
            lastName: lead.name.split(' ').slice(1).join(' ') || undefined,
            email: lead.email,
            phone: lead.phone,
            whatsApp: lead.whatsApp,
            isPrimary: true
          }
        ],
        { session: mongoSession }
      );
    }

    lead.status = 'Converted';
    lead.convertedAt = new Date();
    lead.convertedBy = userId as any;
    if ((lead as any).save) await (lead as any).save();

    await Activity.create(
      [
        {
          organizationId: orgId,
          leadId: lead._id,
          userId,
          type: 'status_change',
          content: 'Lead converted to Customer.',
          metadata: { customerId: customer._id }
        }
      ],
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return res.status(200).json({
      success: true,
      message: 'Lead converted successfully.',
      data: { customer, leadStatus: lead.status }
    });
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    logger.error('Lead conversion failed:', err);
    next(err);
  }
}

export async function addLeadNote(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note text cannot be empty.',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
        errorCode: 'LEAD_NOT_FOUND'
      });
    }

    const activity = await Activity.create({
      organizationId: orgId,
      leadId: lead._id,
      userId,
      type: 'note',
      content: note.trim(),
      metadata: { note: note.trim() }
    });

    return res.status(201).json({
      success: true,
      message: 'Quick note logged successfully.',
      data: activity
    });
  } catch (error) {
    next(error);
  }
}
