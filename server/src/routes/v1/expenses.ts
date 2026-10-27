import { Router } from 'express';
import { expenseController } from '../../controllers/expenseController';
import { idempotent } from '../../middleware/idempotency';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { CAN_APPROVE, CAN_CREATE, CAN_DELETE, CAN_UPDATE } from '../../config/permissions';

const router = Router();
router.use(authenticate, requireOrganization);

router.get('/', asyncHandler(expenseController.getAll.bind(expenseController)));
router.post('/', authorize(...CAN_CREATE), idempotent, asyncHandler(expenseController.create.bind(expenseController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(expenseController.update.bind(expenseController)));
router.delete('/:id', authorize(...CAN_DELETE), asyncHandler(expenseController.delete.bind(expenseController)));

// Workflow transitions, each enforced on the server regardless of what the UI shows.
router.post('/:id/approve', authorize(...CAN_APPROVE), asyncHandler(expenseController.approve.bind(expenseController)));
router.post('/:id/reject', authorize(...CAN_APPROVE), asyncHandler(expenseController.reject.bind(expenseController)));
router.post('/:id/pay', authorize(...CAN_APPROVE), idempotent, asyncHandler(expenseController.pay.bind(expenseController)));

export default router;
