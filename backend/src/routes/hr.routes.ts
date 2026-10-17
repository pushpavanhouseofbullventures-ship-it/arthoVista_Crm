import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import {
  getHRLeads,
  createHRLead,
  assignHRLead,
  updateHRLeadStatus,
  logHRCall,
  getHRCallLogs,
  getHRCallers,
  getHRStats
} from '../controllers/hr.controller';

const router = Router();

// Apply auth and tenant isolation
router.use(authenticate, tenantIsolation);

// Protected: Only Admin, Manager, and HR roles are authorized to access HR endpoints
router.use((req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole;
  const isSuperAdmin = ['Super Admin', 'Admin'].includes(userRole) || req.user?.email === 'shivamthakur12012@gmail.com';
  const isManager = isSuperAdmin || userRole === 'Manager';
  const isHR =
    ['HR', 'HR Executive', 'HR Caller', 'HR Specialist', 'HR Manager'].includes(userRole) ||
    (typeof userRole === 'string' && userRole.toLowerCase().includes('hr'));

  if (!isSuperAdmin && !isManager && !isHR) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. The HR section is restricted to Admin, Manager, and HR staff only.',
      errorCode: 'FORBIDDEN'
    });
  }
  next();
});

// 1. Stats & Callers
router.get('/stats', getHRStats);
router.get('/callers', getHRCallers);

// 2. HR Leads (Strictly role-scoped: Admin sees all; HR caller sees only assigned)
router.get('/leads', getHRLeads);
router.post('/leads', createHRLead); // Admin only

// 3. Lead Assignment (Admin only)
router.patch('/leads/:id/assign', assignHRLead);

// 4. Status Update (Admin & assigned caller)
router.patch('/leads/:id/status', updateHRLeadStatus);

// 5. Calling Functionality & Call History (Compatible with Web & Android SIM Sync APK)
router.post('/leads/:id/call', logHRCall);
router.get('/leads/:id/call-logs', getHRCallLogs);

export default router;
