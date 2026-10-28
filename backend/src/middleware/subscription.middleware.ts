import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';
import { Organization } from '../models/Organization';

/**
 * Ensures Organization subscription is active and not suspended or expired
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'No organization context found for this request.',
        errorCode: 'ORGANIZATION_REQUIRED'
      });
    }

    // Check organization suspension
    const org = await Organization.findById(orgId);
    if (!org || org.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your organization subscription has been suspended. Please contact the administrator.',
        errorCode: 'ORGANIZATION_SUSPENDED'
      });
    }

    // Check subscription status
    const { subscription, isExpired, isGracePeriod } = await saasService.getOrganizationSubscription(orgId);

    if (subscription.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your organization subscription is suspended. Please contact the platform administrator.',
        errorCode: 'SUBSCRIPTION_SUSPENDED'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Your organization subscription has been cancelled.',
        errorCode: 'SUBSCRIPTION_CANCELLED'
      });
    }

    if (isExpired && !isGracePeriod) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew your plan to continue using CRM features.',
        errorCode: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Attach verified subscription to request
    (req as any).subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory to check live resource limits against subscription
 */
export function checkUsageLimit(resource: 'users' | 'leads' | 'contacts' | 'campaigns' | 'followUps' | 'tasks' | 'invoices') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId;
      if (!orgId) return next();

      const { subscription, usage } = await saasService.getOrganizationSubscription(orgId);
      const limits = subscription.limitsAtPurchase || {};

      let maxLimit = -1;
      let currentCount = 0;

      if (resource === 'users') {
        maxLimit = subscription.maxUsersAtPurchase ?? 3;
        currentCount = usage.users;
      } else {
        maxLimit = (limits as any)[resource] ?? -1;
        currentCount = (usage as any)[resource] ?? 0;
      }

      // If limit is not unlimited (-1 or 99999) and exceeded
      if (maxLimit !== -1 && maxLimit !== 99999 && currentCount >= maxLimit) {
        return res.status(403).json({
          success: false,
          errorCode: resource === 'users' ? 'USER_LIMIT_REACHED' : 'RESOURCE_LIMIT_REACHED',
          message: `Your current plan limit of ${maxLimit} ${resource} has been reached (${currentCount}/${maxLimit}). Please upgrade your subscription to add more.`,
          data: {
            resource,
            currentCount,
            maxLimit,
            planName: subscription.planName
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory to verify feature permission in subscription
 */
export function checkFeature(feature: 'email' | 'whatsapp' | 'instagram' | 'phoneCalls' | 'analytics' | 'reports' | 'automation' | 'aiCopilot') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId;
      if (!orgId) return next();

      const { subscription } = await saasService.getOrganizationSubscription(orgId);
      const features = subscription.featuresAtPurchase || {};

      if (!(features as any)[feature]) {
        return res.status(403).json({
          success: false,
          errorCode: 'FEATURE_NOT_INCLUDED',
          message: `The feature "${feature}" is not included in your organization's current plan (${subscription.planName}). Please upgrade your plan to unlock this capability.`,
          data: {
            feature,
            planName: subscription.planName
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Restricts endpoint strictly to Platform Admins (shivamthakur12012@gmail.com & shivam.arthaventures@gmail.com)
 */
export function platformAdminOnly(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  const adminEmails = ['shivamthakur12012@gmail.com', 'shivam.arthaventures@gmail.com'];
  if (adminEmails.includes((user?.email || '').toLowerCase().trim()) || (req as any).userRole === 'Admin' || (req as any).userRole === 'Super Admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Platform Administrator privileges strictly reserved for System Admins.',
    errorCode: 'FORBIDDEN_PLATFORM_ADMIN'
  });
}
