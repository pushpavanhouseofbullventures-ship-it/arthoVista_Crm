import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';
import { Plan } from '../models/Plan';
import { Subscription } from '../models/Subscription';
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
    const plan = await saasService.updatePlan(req.params.id, req.body, req.user);
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
    const plan = await saasService.togglePlanStatus(req.params.id, req.user);
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

export async function getAdminSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, search } = req.query;
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const subscriptions = await Subscription.find(query)
      .populate('organizationId', 'name email phone isSuspended')
      .populate('planId')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function manualAssignAdminSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.manualAssignSubscription({
      ...req.body,
      adminUser: req.user
    });
    return res.json({
      success: true,
      message: 'Subscription successfully assigned to organization.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function extendAdminSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.extendSubscription({
      subscriptionId: req.params.id,
      extendDays: req.body.extendDays ? Number(req.body.extendDays) : undefined,
      customEndDate: req.body.customEndDate ? new Date(req.body.customEndDate) : undefined,
      adminUser: req.user,
      reason: req.body.reason
    });
    return res.json({
      success: true,
      message: `Subscription expiry extended to ${sub.endDate.toLocaleDateString()}.`,
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function changeAdminSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.changeSubscriptionPlan({
      subscriptionId: req.params.id,
      newPlanId: req.body.newPlanId,
      effective: req.body.effective || 'immediate',
      adminUser: req.user,
      reason: req.body.reason
    });
    return res.json({
      success: true,
      message: 'Subscription plan change executed successfully.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendAdminSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.suspendSubscription(req.params.id, req.body.reason, req.user);
    return res.json({
      success: true,
      message: 'Subscription and organization successfully suspended.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function activateAdminSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.reactivateSubscription(req.params.id, req.user);
    return res.json({
      success: true,
      message: 'Subscription and organization reactivated successfully.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelAdminSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.cancelSubscription(
      req.params.id, 
      req.body.cancelImmediately ?? true, 
      req.user
    );
    return res.json({
      success: true,
      message: 'Subscription cancelled successfully.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminCustomSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const sub = await saasService.createCustomSubscription({
      ...req.body,
      adminUser: req.user
    });
    return res.status(201).json({
      success: true,
      message: 'Custom customer subscription created and activated successfully.',
      data: sub
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    
    // Attach member count and subscription for each org
    const orgsWithDetails = await Promise.all(
      orgs.map(async (org) => {
        const [userCount, sub] = await Promise.all([
          UserOrganizationRole.countDocuments({ organizationId: org._id }),
          Subscription.findOne({ organizationId: org._id }).populate('planId')
        ]);
        return {
          ...org.toObject(),
          userCount,
          subscription: sub
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
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    org.isSuspended = !org.isSuspended;
    org.suspendedAt = org.isSuspended ? new Date() : null;
    await org.save();

    // Also update subscription status accordingly
    if (org.isSuspended) {
      await Subscription.findOneAndUpdate(
        { organizationId: org._id },
        { status: 'suspended', suspendedAt: new Date(), suspensionReason: req.body.reason || 'Admin suspended organization' }
      );
    } else {
      await Subscription.findOneAndUpdate(
        { organizationId: org._id },
        { status: 'active', suspendedAt: null, suspensionReason: null }
      );
    }

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
