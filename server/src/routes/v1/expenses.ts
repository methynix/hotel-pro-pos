import { Router } from 'express';
import { expenseController } from '../../controllers/expenseController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(expenseController.getAll.bind(expenseController)));
router.post('/', asyncHandler(expenseController.create.bind(expenseController)));
router.patch('/:id', asyncHandler(expenseController.update.bind(expenseController)));
router.delete('/:id', asyncHandler(expenseController.delete.bind(expenseController)));

export default router;
