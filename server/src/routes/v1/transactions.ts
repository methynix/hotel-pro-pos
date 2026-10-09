import { Router } from 'express';
import { transactionController } from '../../controllers/transactionController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(transactionController.getAll.bind(transactionController)));
router.post('/', authorize(...CAN_CREATE), asyncHandler(transactionController.create.bind(transactionController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(transactionController.update.bind(transactionController)));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(transactionController.delete.bind(transactionController)));

export default router;
