import { Request, Response, NextFunction } from 'express';
import { Lead } from '../models/Lead';
import { FollowUp } from '../models/FollowUp';
import { UserOrganizationRole } from '../models/UserOrganizationRole';
import { AssignmentLog } from '../models/AssignmentLog';
import { AuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

// Helper: Check if user is Admin or Manager
function checkIsAdmin(req: Request): boolean {
  const userRole = (req as any).userRole;
  return (
    ['Super Admin', 'Admin', 'Manager'].includes(userRole) ||
    ['shivam.arthaventures@gmail.com', 'shivamthakur12012@gmail.com'].includes(req.user?.email || '')
  );
}

// 1. GET SEPARATE HR LEADS (Role scoped: Admin sees all; HR caller sees only assigned)
export async function getHRLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const isAdmin = checkIsAdmin(req);
    const { status, assignedTo, search } = req.query;

    const query: any = {
      organizationId: orgId,
      leadType: 'HR',
      isDeleted: false
    };

    // Strict role restriction:
    // HR Caller can ONLY see leads assigned to them by Admin.
    // Admin can see all leads, or filter by specific caller/unassigned.
    if (!isAdmin) {
      query.assignedTo = userId;
    } else {
      if (assignedTo === 'unassigned') {
        query.assignedTo = { $in: [null, undefined] };
      } else if (assignedTo) {
        query.assignedTo = assignedTo;
      }
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q } },
        { phone: { $regex: q } },
        { email: { $regex: q } },
        { serviceInterested: { $regex: q } }, // Position Applied
        { leadId: { $regex: q } }
      ];
    }

    // Auto-seed initial HR candidate leads if none exist yet for immediate functionality
    const totalHRLeads = await Lead.countDocuments({ organizationId: orgId, leadType: 'HR', isDeleted: false });
    if (totalHRLeads === 0 && isAdmin && orgId) {
      await seedInitialHRLeads(orgId, userId);
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'firstName lastName email status')
      .sort({ createdAt: -1 });

    // Fetch call summary (total calls and latest call) for each lead
    const leadsWithCallInfo = await Promise.all(
      leads.map(async (lead: any) => {
        const leadObj = lead.toObject ? lead.toObject() : lead;

        // Find recent calls from FollowUp (includes both Web dialer and Android SIM Sync APK)
        const callLogs = await FollowUp.find({
          organizationId: orgId,
          leadId: lead._id,
          channel: 'phone'
        }).sort({ date: -1 });

        const totalCalls = callLogs.length;
        const lastCall: any = callLogs[0] || null;

        return {
          ...leadObj,
          totalCalls,
          lastCall: lastCall ? {
            date: lastCall.date,
            outcome: lastCall.outcome || 'Connected',
            duration: (lastCall.channelDetails as any)?.callDuration || 0,
            notes: lastCall.notes || '',
            source: (lastCall.channelDetails as any)?.source || 'web_dialer'
          } : null
        };
      })
    );

    return res.json({
      success: true,
      data: leadsWithCallInfo,
      isAdmin
    });
  } catch (error) {
    next(error);
  }
}

// 2. CREATE NEW HR LEAD (Admin Only)
export async function createHRLead(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = checkIsAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admins can add HR candidate leads.',
        errorCode: 'FORBIDDEN'
      });
    }

    const orgId = req.organizationId;
    const adminId = req.user?.id;
    const {
      name,
      phone,
      email,
      serviceInterested = 'Telecaller / Sales Executive', // Candidate Position Applied
      priority = 'medium',
      assignedTo,
      location,
      notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name and phone number are required.'
      });
    }

    // Auto-generate HR-XXXXX leadId
    const count = await Lead.countDocuments({ organizationId: orgId, leadType: 'HR' });
    const leadId = `HR-${10001 + count}`;

    const newLead = await Lead.create({
      organizationId: orgId,
      leadId,
      leadType: 'HR',
      source: 'HR Recruitment',
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      serviceInterested: serviceInterested.trim(),
      priority,
      status: 'New',
      assignedTo: assignedTo || null,
      location: location || '',
      notes: notes || '',
      score: 50,
      scoreCategory: 'warm'
    });

    // If assigned on creation, log assignment
    if (assignedTo) {
      await AssignmentLog.create({
        organizationId: orgId,
        leadId: newLead._id,
        assignedById: adminId,
        toUserId: assignedTo,
        rule: 'manual_admin_assign',
        createdAt: new Date()
      });
    }

    await AuditLog.create({
      userId: adminId,
      organizationId: orgId,
      action: 'HR_LEAD_CREATED',
      entity: 'Lead',
      entityId: newLead._id.toString(),
      newValue: { name, phone, serviceInterested, assignedTo }
    });

    return res.status(201).json({
      success: true,
      message: `HR candidate lead for "${name}" created successfully.`,
      data: newLead
    });
  } catch (error) {
    next(error);
  }
}

// 3. ASSIGN HR LEAD (Admin Only)
export async function assignHRLead(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = checkIsAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admins can assign HR leads.',
        errorCode: 'FORBIDDEN'
      });
    }

    const { id } = req.params;
    const { assignedTo } = req.body;
    const orgId = req.organizationId;
    const adminId = req.user?.id;

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, leadType: 'HR' });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'HR Lead not found.' });
    }

    const previousAssignee = lead.assignedTo;
    lead.assignedTo = assignedTo || null;
    await lead.save();

    await AssignmentLog.create({
      organizationId: orgId,
      leadId: lead._id,
      assignedById: adminId,
      fromUserId: previousAssignee || undefined,
      toUserId: assignedTo || undefined,
      rule: 'admin_manual_hr_assign',
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: assignedTo ? 'HR lead assigned successfully.' : 'HR lead moved to unassigned queue.',
      data: lead
    });
  } catch (error) {
    next(error);
  }
}

// 4. UPDATE HR LEAD STATUS & NOTES (HR Caller or Admin)
export async function updateHRLeadStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes, nextFollowUp } = req.body;
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const isAdmin = checkIsAdmin(req);

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, leadType: 'HR' });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'HR Lead not found.' });
    }

    // Non-admin can only update leads assigned to them
    if (!isAdmin && lead.assignedTo?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update leads assigned to you.',
        errorCode: 'FORBIDDEN'
      });
    }

    if (status) lead.status = status;
    if (notes) lead.notes = notes;
    if (nextFollowUp) lead.nextFollowUp = new Date(nextFollowUp);

    await lead.save();

    return res.json({
      success: true,
      message: `Lead status updated to "${status}".`,
      data: lead
    });
  } catch (error) {
    next(error);
  }
}

// 5. LOG CALL (Calling Functionality for HR)
export async function logHRCall(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { outcome = 'Connected', duration = 60, notes = '', nextFollowUp } = req.body;
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const isAdmin = checkIsAdmin(req);

    const lead = await Lead.findOne({ _id: id, organizationId: orgId, leadType: 'HR' });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'HR Lead not found.' });
    }

    if (!isAdmin && lead.assignedTo?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only call leads assigned to you.',
        errorCode: 'FORBIDDEN'
      });
    }

    const now = new Date();
    lead.lastContacted = now;

    // Map call outcome to candidate lead status
    if (outcome === 'Interview Scheduled') {
      lead.status = 'Interview Scheduled';
    } else if (outcome === 'Interested') {
      lead.status = 'Interested';
    } else if (outcome === 'Selected') {
      lead.status = 'Selected';
    } else if (outcome === 'Rejected' || outcome === 'Not Interested') {
      lead.status = 'Rejected';
    } else if (outcome === 'Callback') {
      lead.status = 'Callback';
    } else if (lead.status === 'New') {
      lead.status = 'Contacted';
    }

    if (nextFollowUp) {
      lead.nextFollowUp = new Date(nextFollowUp);
    }
    await lead.save();

    // Create FollowUp call log (matches the Mobile SIM Sync APK format)
    const followUp = await FollowUp.create({
      organizationId: orgId,
      leadId: lead._id,
      assignedTo: userId,
      type: 'phone',
      channel: 'phone',
      date: now,
      purpose: `HR Candidate Call (${outcome}) — ${lead.name}`,
      status: 'completed',
      outcome,
      notes: notes || `HR phone call (${outcome}). Duration: ${duration}s`,
      channelDetails: {
        callDuration: Number(duration) || 0,
        callOutcome: outcome,
        source: 'web_dialer',
        callType: 'OUTGOING',
        phoneNumber: lead.phone
      }
    });

    return res.status(201).json({
      success: true,
      message: `Call logged for ${lead.name} (${outcome}).`,
      data: {
        lead,
        callLog: followUp
      }
    });
  } catch (error) {
    next(error);
  }
}

// 6. GET CALL HISTORY FOR AN HR LEAD (Includes Mobile SIM Sync APK logs)
export async function getHRCallLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const callLogs = await FollowUp.find({
      organizationId: orgId,
      leadId: id,
      channel: 'phone'
    })
      .populate('assignedTo', 'firstName lastName email')
      .sort({ date: -1 });

    return res.json({
      success: true,
      data: callLogs
    });
  } catch (error) {
    next(error);
  }
}

// 7. GET HR CALLERS (Team members who can be assigned HR calling leads)
export async function getHRCallers(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const memberships = await UserOrganizationRole.find({ organizationId: orgId })
      .populate('userId', 'firstName lastName email status')
      .populate('roleId', 'name');

    const callers = memberships
      .filter((m: any) => m.userId && m.userId.status === 'active')
      .map((m: any) => ({
        id: m.userId._id,
        name: `${m.userId.firstName} ${m.userId.lastName}`,
        email: m.userId.email,
        role: m.roleId?.name || 'HR Caller'
      }));

    return res.json({
      success: true,
      data: callers
    });
  } catch (error) {
    next(error);
  }
}

// 8. GET HR CALLING STATS
export async function getHRStats(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const isAdmin = checkIsAdmin(req);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, myAssignedLeads, unassignedLeads, callsToday, interviewsScheduled, selected] = await Promise.all([
      Lead.countDocuments({ organizationId: orgId, leadType: 'HR', isDeleted: false }),
      Lead.countDocuments({ organizationId: orgId, leadType: 'HR', assignedTo: userId, isDeleted: false }),
      Lead.countDocuments({ organizationId: orgId, leadType: 'HR', assignedTo: { $in: [null, undefined] }, isDeleted: false }),
      FollowUp.countDocuments({
        organizationId: orgId,
        channel: 'phone',
        date: { $gte: todayStart },
        ...(!isAdmin ? { assignedTo: userId } : {})
      }),
      Lead.countDocuments({ organizationId: orgId, leadType: 'HR', status: 'Interview Scheduled', isDeleted: false }),
      Lead.countDocuments({ organizationId: orgId, leadType: 'HR', status: 'Selected', isDeleted: false })
    ]);

    return res.json({
      success: true,
      data: {
        totalLeads,
        myAssignedLeads,
        unassignedLeads,
        callsToday,
        interviewsScheduled,
        selected,
        isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
}

// Helper: Seed Initial HR Leads for demonstration
async function seedInitialHRLeads(orgId: string, adminId?: string) {
  const initialCandidates = [
    {
      leadId: 'HR-10001',
      name: 'Rohit Sharma',
      phone: '+91 98112 34567',
      email: 'rohit.sharma@gmail.com',
      serviceInterested: 'Telecalling & Inside Sales',
      priority: 'high',
      status: 'New',
      location: 'Noida, Sector 62',
      notes: '3 years experience in B2B financial telecalling. Fluent in Hindi and English.',
      assignedTo: adminId
    },
    {
      leadId: 'HR-10002',
      name: 'Neha Gupta',
      phone: '+91 98223 45678',
      email: 'neha.gupta@yahoo.com',
      serviceInterested: 'Business Development Executive',
      priority: 'medium',
      status: 'Contacted',
      location: 'Delhi NCR',
      notes: 'MBA in Marketing, 1.5 yrs experience in CRM sales outreach. Immediate joiner.',
      assignedTo: adminId
    },
    {
      leadId: 'HR-10003',
      name: 'Vikas Singh',
      phone: '+91 98334 56789',
      email: 'vikas.singh@outlook.com',
      serviceInterested: 'Loan & Credit Processing Officer',
      priority: 'high',
      status: 'Interview Scheduled',
      location: 'Ghaziabad, UP',
      notes: 'Ex-Bajaj Finance loan verification officer. Looking for CTC ₹35,000/mo.',
      assignedTo: adminId
    },
    {
      leadId: 'HR-10004',
      name: 'Sunita Rao',
      phone: '+91 98445 67890',
      email: 'sunita.rao@gmail.com',
      serviceInterested: 'Customer Support Executive',
      priority: 'low',
      status: 'New',
      location: 'Greater Noida',
      notes: 'Fresh graduate with strong phone communication skills.',
      assignedTo: null
    }
  ];

  for (const c of initialCandidates) {
    await Lead.create({
      organizationId: orgId,
      leadType: 'HR',
      source: 'HR Recruitment',
      ...c,
      score: 50,
      scoreCategory: 'warm'
    });
  }
}
