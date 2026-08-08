import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);

export default router;
