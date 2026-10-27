import express, { Router } from 'express';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { CAN_CREATE, CAN_DELETE } from '../../config/permissions';
import { receiptController } from '../../controllers/receiptController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate, requireOrganization);

router.post('/', authorize(...CAN_CREATE), asyncHandler(receiptController.generate));
router.get('/', asyncHandler(receiptController.getAll));
router.get('/transaction/:transactionId', asyncHandler(receiptController.getByTransaction));
router.get('/print/:receiptId', asyncHandler(receiptController.printReceipt));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(receiptController.delete));

export default router;
