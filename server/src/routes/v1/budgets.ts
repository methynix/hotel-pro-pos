import express, { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';
import { budgetController } from '../../controllers/budgetController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/', authorize(...CAN_CREATE), asyncHandler(budgetController.create));
router.get('/', asyncHandler(budgetController.getAll));
router.get('/alerts', asyncHandler(budgetController.getAlerts));
router.get('/:id', asyncHandler(budgetController.getById));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(budgetController.update));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(budgetController.delete));

export default router;
