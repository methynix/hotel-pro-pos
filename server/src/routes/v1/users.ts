import { Router } from 'express';
import { userController } from '../../controllers/userController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin'), asyncHandler(userController.getAll.bind(userController)));
router.patch('/:id', authorize('admin'), asyncHandler(userController.update.bind(userController)));
router.delete('/:id', authorize('admin'), asyncHandler(userController.delete.bind(userController)));

export default router;
