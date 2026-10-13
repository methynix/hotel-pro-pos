import { Router } from 'express';
import { notificationController } from '../../controllers/notificationController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(notificationController.getAll.bind(notificationController)));
router.post('/read-all', asyncHandler(notificationController.markAllRead.bind(notificationController)));
router.patch('/:id/read', asyncHandler(notificationController.markRead.bind(notificationController)));

export default router;
