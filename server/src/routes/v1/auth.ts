import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// Public routes (no auth required)
router.post('/login', asyncHandler(authController.login.bind(authController)));
router.post('/register', asyncHandler(authController.register.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser.bind(authController)));
router.patch('/me', authenticate, asyncHandler(authController.updateProfile.bind(authController)));
router.post('/change-password', authenticate, asyncHandler(authController.changePassword.bind(authController)));

export default router;
