import { Router } from 'express';
import { expenseController } from '../../controllers/expenseController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(expenseController.getAll.bind(expenseController)));
router.post('/', authorize(...CAN_CREATE), asyncHandler(expenseController.create.bind(expenseController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(expenseController.update.bind(expenseController)));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(expenseController.delete.bind(expenseController)));

export default router;
