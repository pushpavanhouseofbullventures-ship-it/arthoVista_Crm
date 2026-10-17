import { Router } from 'express';
import { 
  getPublicPlans, 
  getSubscriptionDetails, 
  createCheckoutOrder, 
  verifyPayment, 
  subscribeToPlan 
} from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';

const router = Router();

// Public route to fetch active plans
router.get('/plans', getPublicPlans);

// Organization Protected routes
router.use(authenticate, tenantIsolation);

router.get('/subscription', getSubscriptionDetails);
router.post('/create-order', createCheckoutOrder);
router.post('/verify-payment', verifyPayment);
router.post('/subscribe', subscribeToPlan);

export default router;
