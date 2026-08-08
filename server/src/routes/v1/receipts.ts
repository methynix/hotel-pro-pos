import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { receiptController } from '../../controllers/receiptController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/', asyncHandler(receiptController.generate));
router.get('/', asyncHandler(receiptController.getAll));
router.get('/transaction/:transactionId', asyncHandler(receiptController.getByTransaction));
router.get('/print/:receiptId', asyncHandler(receiptController.printReceipt));
router.delete('/:id', asyncHandler(receiptController.delete));

export default router;
