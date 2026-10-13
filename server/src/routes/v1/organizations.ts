import { Router } from 'express';
import { organizationController } from '../../controllers/organizationController';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Any signed-in user can found a new organization.
router.post('/', asyncHandler(organizationController.create));
router.get('/current', requireOrganization, asyncHandler(organizationController.getCurrent));
router.patch('/current', requireOrganization, authorize('admin'), asyncHandler(organizationController.updateCurrent));

export default router;
