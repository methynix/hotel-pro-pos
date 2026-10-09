import { Router } from 'express';
import { accountController } from '../../controllers/accountController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(accountController.getAll.bind(accountController)));
router.post('/', authorize(...CAN_CREATE), asyncHandler(accountController.create.bind(accountController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(accountController.update.bind(accountController)));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(accountController.delete.bind(accountController)));

export default router;
