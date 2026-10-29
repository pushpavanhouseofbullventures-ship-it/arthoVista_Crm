import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';
import { Plan } from '../models/Plan';
import { Organization } from '../models/Organization';
import { Payment } from '../models/Payment';
import { SaaSAuditLog } from '../models/SaaSAuditLog';
import { UserOrganizationRole } from '../models/UserOrganizationRole';

export async function getAdminOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await saasService.getPlatformOverview();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAdminPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await saasService.getAllPlans();
    return res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
}

export async function createAdminPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await saasService.createPlan(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: `Plan "${plan.name}" created successfully.`,
      data: plan
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await saasService.updatePlan(req.params.id as string, req.body, req.user);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }
    return res.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully.`,
      data: plan
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleAdminPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await saasService.togglePlanStatus(req.params.id as string, req.user);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }
    return res.json({
      success: true,
      message: `Plan "${plan.name}" status updated to ${plan.isActive ? 'Active' : 'Inactive'}.`,
      data: plan
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });

    // Attach member count for each org
    const orgsWithDetails = await Promise.all(
      orgs.map(async (org) => {
        const userCount = await UserOrganizationRole.countDocuments({ organizationId: org._id });
        return {
          ...org.toObject(),
          userCount
        };
      })
    );

    return res.json({ success: true, data: orgsWithDetails });
  } catch (error) {
    next(error);
  }
}

export async function toggleAdminOrganizationSuspension(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await Organization.findById(req.params.id as string);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    org.isSuspended = !org.isSuspended;
    org.suspendedAt = org.isSuspended ? new Date() : null;
    await org.save();
    const user = req.user as any;
    await SaaSAuditLog.create({
      adminId: user?.id || user?._id,
      adminEmail: user?.email || 'admin@arthaventure.com',
      adminName: `${user?.firstName || 'Admin'} ${user?.lastName || ''}`.trim(),
      organizationId: org._id,
      organizationName: org.name,
      action: org.isSuspended ? 'ORGANIZATION_SUSPENDED' : 'ORGANIZATION_ACTIVATED',
      reason: req.body.reason || 'Toggled by administrator'
    });

    return res.json({
      success: true,
      message: `Organization "${org.name}" is now ${org.isSuspended ? 'Suspended' : 'Active'}.`,
      data: org
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const payments = await Payment.find()
      .populate('organizationId', 'name email phone')
      .populate('planId', 'name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}

export async function getAdminAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const logs = await SaaSAuditLog.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}
