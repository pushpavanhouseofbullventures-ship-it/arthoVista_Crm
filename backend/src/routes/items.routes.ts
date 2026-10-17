import { Router } from 'express';
import { 
  getItems, 
  getItem, 
  createItem, 
  updateItem, 
  deleteItem 
} from '../controllers/items.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', authorize(['accounting:read']), getItems);
router.get('/:id', authorize(['accounting:read']), getItem);
router.post('/', authorize(['accounting:write']), createItem);
router.put('/:id', authorize(['accounting:write']), updateItem);
router.delete('/:id', authorize(['accounting:delete']), deleteItem);

export default router;
