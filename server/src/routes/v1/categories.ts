import { Router } from 'express';
import { categoryController } from '../../controllers/categoryController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(categoryController.getAll.bind(categoryController)));
router.post('/', asyncHandler(categoryController.create.bind(categoryController)));
router.patch('/:id', asyncHandler(categoryController.update.bind(categoryController)));
router.delete('/:id', asyncHandler(categoryController.delete.bind(categoryController)));

export default router;
