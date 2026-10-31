import { Request, Response, NextFunction } from 'express';
import { FollowUp } from '../models/FollowUp';
import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import logger from '../utils/logger';

const ADMIN_EMAILS = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'];
const isSystemAdmin = (role?: string, email?: string) =>
  ['Admin', 'Super Admin'].includes(role || '') || ADMIN_EMAILS.includes((email || '').toLowerCase().trim());

export async function getFollowUps(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    const userId = req.user?.id;
    const { status, type, period, assignedTo } = req.query;

    const query: any = { organizationId: orgId };

    if (!isPrivileged && userId) {
      query.assignedTo = userId;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    // Period Filter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (period === 'today') {
      query.date = { $gte: todayStart, $lte: todayEnd };
    } else if (period === 'upcoming') {
      query.date = { $gt: todayEnd };
      query.status = 'pending';
    } else if (period === 'overdue') {
      query.date = { $lt: todayStart };
      query.status = 'pending';
    }

    const followups = await FollowUp.find(query)
      .populate('leadId', 'name company email phone leadId isDeleted')
      .populate('customerId', 'name companyName email phone customerId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ date: 1, time: 1 });

    const activeFollowups = followups.filter((f: any) => {
      if (f.leadId) {
        if (typeof f.leadId === 'object' && f.leadId.isDeleted === true) return false;
      } else if (!f.customerId) {
        return false;
      }
      return true;
    });

    return res.json({
      success: true,
      data: activeFollowups
    });
  } catch (error) {
    next(error);
  }
}

export async function createFollowUp(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userRole = (req as any).userRole;
    const isPrivileged = isSystemAdmin(userRole, req.user?.email) || userRole === 'Manager';
    const userId = req.user?.id;
    const { leadId, customerId, date, time, type, notes, assignedTo } = req.body;

    const targetAssignedTo = isPrivileged ? (assignedTo || userId) : userId;

    const followup = await FollowUp.create({
      organizationId: orgId,
      leadId,
      customerId,
      assignedTo: targetAssignedTo,
      date: new Date(date),
      time,
      type,
      notes,
      status: 'pending'
    });

    // Update Lead.nextFollowUp & single-row followUpHistory if linked
    if (leadId) {
      const targetLead = await Lead.findById(leadId);
      if (targetLead) {
        const fuEntry = {
          followUpId: followup._id || (followup as any)?.id || `${Date.now()}`,
          date: new Date(date),
          time,
          type,
          notes,
          status: 'pending',
          assignedTo: targetAssignedTo
        };
        const currentFuHistory = Array.isArray((targetLead as any).followUpHistory) ? (targetLead as any).followUpHistory : [];
        (targetLead as any).followUpHistory = [...currentFuHistory, fuEntry];
        targetLead.nextFollowUp = new Date(date);
        await targetLead.save();
      }
      
      // Log in Lead Activity timeline
      await Activity.create({
        organizationId: orgId,
        leadId,
        userId,
        type: 'call',
        content: `Scheduled a follow-up (${type}) for ${date} at ${time}.`,
        metadata: { followupId: followup._id }
      });
    }

    return res.status(201).json({
      success: true,
      data: followup
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFollowUp(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { status, outcome, notes } = req.body;

    const oldFollowup = await FollowUp.findOne({ _id: id, organizationId: orgId });
    if (!oldFollowup) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up task not found.',
        errorCode: 'NOT_FOUND'
      });
    }

    const updatedFollowup = await FollowUp.findByIdAndUpdate(
      id,
      { $set: { status, outcome, notes } },
      { new: true }
    );

    // If completed/cancelled, update activity logs
    if (status && oldFollowup.status !== status) {
      const logContent = status === 'completed' 
        ? `Completed scheduled follow-up. Outcome: ${outcome || 'No outcome recorded.'}`
        : `Cancelled scheduled follow-up.`;

      if (oldFollowup.leadId) {
        await Activity.create({
          organizationId: orgId,
          leadId: oldFollowup.leadId,
          userId,
          type: 'call',
          content: logContent,
          metadata: { followupId: id, status, outcome }
        });

        // Clear nextFollowUp date on lead
        if (status === 'completed') {
          await Lead.findByIdAndUpdate(oldFollowup.leadId, { $unset: { nextFollowUp: 1 } });
        }
      }
    }

    return res.json({
      success: true,
      data: updatedFollowup
    });
  } catch (error) {
    next(error);
  }
}
