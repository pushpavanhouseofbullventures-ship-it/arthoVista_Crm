import { Router } from 'express';
import { 
  getInvoices, 
  getInvoice, 
  createInvoice, 
  transitionInvoiceStatus, 
  recordPayment 
} from '../controllers/invoices.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Middleware strictly restricting invoice endpoints from sale employees
const restrictFromSales = (req: any, res: any, next: any) => {
  const userRole = req.userRole;
  const userEmail = (req.user?.email || '').toLowerCase().trim();
  const isMaster = userEmail === 'shivam.arthaventures@gmail.com' || userEmail === 'shivamthakur12012@gmail.com';
  if (isMaster || ['Admin', 'Super Admin', 'Manager', 'Finance', 'Operation', 'Operations'].includes(userRole)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Sales employees do not have access to invoice records.',
    errorCode: 'FORBIDDEN'
  });
};

router.use(authenticate, tenantIsolation, restrictFromSales);

router.get('/', authorize(['accounting:read']), getInvoices);
router.get('/:id', authorize(['accounting:read']), getInvoice);
router.post('/', authorize(['accounting:write']), createInvoice);
router.put('/:id/status', authorize(['accounting:write']), transitionInvoiceStatus);
router.post('/:id/payments', authorize(['accounting:write']), recordPayment);

export default router;
