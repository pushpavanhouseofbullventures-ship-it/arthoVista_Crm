import { Request, Response, NextFunction } from 'express';

/**
 * Ensures Organization subscription is active (Unrestricted - Full Access)
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  // Office CRM operates in full unrestricted mode
  next();
}

/**
 * Middleware factory to check live resource limits (Unrestricted - Unlimited Quotas)
 */
export function checkUsageLimit(_resource: 'users' | 'leads' | 'contacts' | 'campaigns' | 'followUps' | 'tasks' | 'invoices') {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}

/**
 * Middleware factory to verify feature permission (Unrestricted - All Features Enabled)
 */
export function checkFeature(_feature: 'email' | 'whatsapp' | 'instagram' | 'phoneCalls' | 'analytics' | 'reports' | 'automation' | 'aiCopilot') {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    next();
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
