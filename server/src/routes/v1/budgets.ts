import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { budgetController } from '../../controllers/budgetController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/', asyncHandler(budgetController.create));
router.get('/', asyncHandler(budgetController.getAll));
router.get('/alerts', asyncHandler(budgetController.getAlerts));
router.get('/:id', asyncHandler(budgetController.getById));
router.patch('/:id', asyncHandler(budgetController.update));
router.delete('/:id', asyncHandler(budgetController.delete));

export default router;
