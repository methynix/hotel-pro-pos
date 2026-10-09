import { Router } from 'express';
import { userController } from '../../controllers/userController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', asyncHandler(userController.getAll.bind(userController)));
router.post('/', asyncHandler(userController.create.bind(userController)));
router.patch('/:id', asyncHandler(userController.update.bind(userController)));
router.delete('/:id', asyncHandler(userController.delete.bind(userController)));

export default router;
