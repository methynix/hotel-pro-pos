import { Router } from 'express';
import authRoutes from './auth';
import transactionRoutes from './transactions';
import expenseRoutes from './expenses';
import accountRoutes from './accounts';
import categoryRoutes from './categories';
import userRoutes from './users';
import receiptRoutes from './receipts';
import analyticsRoutes from './analytics';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/receipts', receiptRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
