import { Router } from 'express';
import { categoryController } from '../../controllers/categoryController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(categoryController.getAll.bind(categoryController)));
router.post('/', authorize(...CAN_CREATE), asyncHandler(categoryController.create.bind(categoryController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(categoryController.update.bind(categoryController)));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(categoryController.delete.bind(categoryController)));

export default router;
