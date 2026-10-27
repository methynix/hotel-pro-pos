import { Router } from 'express';
import { auditController } from '../../controllers/auditController';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate, requireOrganization, authorize('admin'));

router.get('/', asyncHandler(auditController.getAll));

export default router;
