import { Router } from 'express';
import { transactionController } from '../../controllers/transactionController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(transactionController.getAll.bind(transactionController)));
router.post('/', asyncHandler(transactionController.create.bind(transactionController)));
router.patch('/:id', asyncHandler(transactionController.update.bind(transactionController)));
router.delete('/:id', asyncHandler(transactionController.delete.bind(transactionController)));

export default router;
