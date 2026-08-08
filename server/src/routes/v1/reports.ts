import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { reportController } from '../../controllers/reportController';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = express.Router();

router.use(authenticate);

router.post('/income-statement', asyncHandler(reportController.generateIncomeStatement));
router.post('/cash-flow', asyncHandler(reportController.generateCashFlowStatement));
router.post('/balance-sheet', asyncHandler(reportController.generateBalanceSheet));
router.post('/tax-summary', asyncHandler(reportController.generateTaxSummary));
router.post('/comprehensive', asyncHandler(reportController.generateComprehensiveReport));

router.get('/', asyncHandler(reportController.getAll));
router.get('/:id', asyncHandler(reportController.getById));
router.delete('/:id', asyncHandler(reportController.delete));

export default router;
