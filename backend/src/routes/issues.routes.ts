import { Router } from 'express';
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  addIssueComment,
  uploadScreenshot
} from '../controllers/issues.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantIsolation } from '../middleware/tenant.middleware';
import { uploadMiddleware } from '../controllers/documents.controller';

const router = Router();

// Require logged-in employee and active organization
router.use(authenticate, tenantIsolation);

router.get('/', getIssues);
router.post('/', createIssue);
router.post('/upload-screenshot', uploadMiddleware.single('screenshot'), uploadScreenshot);
router.get('/:id', getIssueById);
router.patch('/:id', updateIssue);
router.post('/:id/comments', addIssueComment);

export default router;
