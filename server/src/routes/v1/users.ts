import { Router } from 'express';
import { userController } from '../../controllers/userController';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

// Members of the caller's organization. New members join via invitations.
const router = Router();
router.use(authenticate, requireOrganization, authorize('admin'));

router.get('/', asyncHandler(userController.getAll.bind(userController)));
router.patch('/:id', asyncHandler(userController.update.bind(userController)));
router.delete('/:id', asyncHandler(userController.delete.bind(userController)));

export default router;
