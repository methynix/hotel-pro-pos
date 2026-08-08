import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { analyticsController } from '../../controllers/analyticsController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.get('/dashboard', asyncHandler(analyticsController.getDashboardMetrics));
router.get('/categories', asyncHandler(analyticsController.getTopCategories));
router.get('/cashflow', asyncHandler(analyticsController.getCashFlowTrend));
router.get('/monthly', asyncHandler(analyticsController.getMonthlyComparison));
router.get('/full', asyncHandler(analyticsController.getFullDashboardData));

export default router;
