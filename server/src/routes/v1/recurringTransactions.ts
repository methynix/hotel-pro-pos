import express, { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';
import { recurringTransactionController } from '../../controllers/recurringTransactionController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/', authorize(...CAN_CREATE), asyncHandler(recurringTransactionController.create));
router.get('/', asyncHandler(recurringTransactionController.getAll));
router.get('/:id', asyncHandler(recurringTransactionController.getById));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(recurringTransactionController.update));
router.patch('/:id/toggle', authorize(...CAN_UPDATE), asyncHandler(recurringTransactionController.toggle));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(recurringTransactionController.delete));

export default router;
