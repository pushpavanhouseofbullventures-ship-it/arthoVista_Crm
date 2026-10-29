import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { platformAdminOnly } from '../middleware/subscription.middleware';
import {
  getAdminOverview,
  getAdminPlans,
  createAdminPlan,
  updateAdminPlan,
  toggleAdminPlan,
  getAdminOrganizations,
  toggleAdminOrganizationSuspension,
  getAdminPayments,
  getAdminAuditLogs
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication and platform administrator privileges
router.use(authenticate);
router.use(platformAdminOnly);

// Overview
router.get('/overview', getAdminOverview);

// Dynamic Plans CRUD
router.get('/plans', getAdminPlans);
router.post('/plans', createAdminPlan);
router.put('/plans/:id', updateAdminPlan);
router.patch('/plans/:id/toggle', toggleAdminPlan);

// Organizations Directory
router.get('/organizations', getAdminOrganizations);
router.patch('/organizations/:id/toggle-suspension', toggleAdminOrganizationSuspension);

// Payments & Audits
router.get('/payments', getAdminPayments);
router.get('/audit-logs', getAdminAuditLogs);

export default router;
