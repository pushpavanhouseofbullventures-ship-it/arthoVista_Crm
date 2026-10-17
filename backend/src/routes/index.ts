import { Router } from 'express';
import authRoutes from './auth.routes';
import orgRoutes from './organization.routes';
import leadRoutes from './leads.routes';
import quotationRoutes from './quotations.routes';
import assignmentRoutes from './assignment.routes';
import customerRoutes from './customers.routes';
import followupRoutes from './followups.routes';
import taskRoutes from './tasks.routes';
import dealRoutes from './deals.routes';
import caseRoutes from './cases.routes';
import docRoutes from './documents.routes';
import itemRoutes from './items.routes';
import invoiceRoutes from './invoices.routes';
import ticketRoutes from './tickets.routes';
import reportRoutes from './reports.routes';
import workflowRoutes from './workflows.routes';
import aiRoutes from './ai.routes';
import billingRoutes from './billing.routes';
import outreachRoutes from './outreach.routes';
import adminRoutes from './admin.routes';
import webhookRoutes from './webhook.routes';
import mobileSyncRoutes from './mobileSync.routes';
import downloadRoutes from './download.routes';
import hrRoutes from './hr.routes';
import issuesRoutes from './issues.routes';
import { getPublicPlans } from '../controllers/billing.controller';

const router = Router();

// Public dynamic plans endpoint
router.get('/plans', getPublicPlans);

// Public download routes
router.use('/download', downloadRoutes);

// Core API routes
router.use('/auth', authRoutes);
router.use('/organizations', orgRoutes);
router.use('/leads', leadRoutes);
router.use('/quotations', quotationRoutes);
router.use('/assignment', assignmentRoutes);
router.use('/customers', customerRoutes);
router.use('/followups', followupRoutes);
router.use('/outreach', outreachRoutes);
router.use('/tasks', taskRoutes);
router.use('/deals', dealRoutes);
router.use('/cases', caseRoutes);
router.use('/documents', docRoutes);
router.use('/items', itemRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/tickets', ticketRoutes);
router.use('/reports', reportRoutes);
router.use('/workflows', workflowRoutes);
router.use('/ai', aiRoutes);
router.use('/billing', billingRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/mobile-sync', mobileSyncRoutes);
router.use('/hr', hrRoutes);
router.use('/issues', issuesRoutes);

export default router;
