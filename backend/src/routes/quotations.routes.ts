import { Router } from 'express';
import { 
  getQuotations, 
  getQuotation, 
  createQuotation, 
  updateQuotation, 
  updateQuotationStatus, 
  convertQuotationToInvoice, 
  getQuotationPdf, 
  deleteQuotation,
  updateOtWorkflow
} from '../controllers/quotations.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { authorize, authorizeAny } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', authorizeAny(['accounting:read', 'leads:read']), getQuotations);
router.get('/:id', authorizeAny(['accounting:read', 'leads:read']), getQuotation);
router.get('/:id/pdf', authorizeAny(['accounting:read', 'leads:read']), getQuotationPdf);
router.post('/', authorize(['accounting:write', 'leads:write']), createQuotation);
router.put('/:id', authorize(['accounting:write', 'leads:write']), updateQuotation);
router.patch('/:id/status', authorize(['accounting:write', 'leads:write']), updateQuotationStatus);
router.patch('/:id/ot-workflow', authorizeAny(['accounting:write', 'leads:write']), updateOtWorkflow);
router.post('/:id/convert-to-invoice', authorize(['accounting:write']), convertQuotationToInvoice);
router.delete('/:id', authorize(['accounting:delete']), deleteQuotation);

export default router;
