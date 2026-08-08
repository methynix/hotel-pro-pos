import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { recurringTransactionController } from '../../controllers/recurringTransactionController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/', asyncHandler(recurringTransactionController.create));
router.get('/', asyncHandler(recurringTransactionController.getAll));
router.get('/:id', asyncHandler(recurringTransactionController.getById));
router.patch('/:id', asyncHandler(recurringTransactionController.update));
router.patch('/:id/toggle', asyncHandler(recurringTransactionController.toggle));
router.delete('/:id', asyncHandler(recurringTransactionController.delete));

export default router;
