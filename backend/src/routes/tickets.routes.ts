import { Router } from 'express';
import { 
  getTickets, 
  getTicket, 
  createTicket, 
  updateTicket, 
  postTicketMessage 
} from '../controllers/tickets.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', authorize(['support:read']), getTickets);
router.get('/:id', authorize(['support:read']), getTicket);
router.post('/', authorize(['support:write']), createTicket);
router.put('/:id', authorize(['support:write']), updateTicket);
router.post('/:id/messages', authorize(['support:write']), postTicketMessage);

export default router;
