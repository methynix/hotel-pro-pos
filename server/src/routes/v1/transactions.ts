import { Router } from 'express';
import { transactionController } from '../../controllers/transactionController';
import { idempotent } from '../../middleware/idempotency';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { CAN_CREATE, CAN_UPDATE, CAN_DELETE } from '../../config/permissions';

const router = Router();
router.use(authenticate, requireOrganization);

router.get('/', asyncHandler(transactionController.getAll.bind(transactionController)));
router.post('/', authorize(...CAN_CREATE), idempotent, asyncHandler(transactionController.create.bind(transactionController)));
router.patch('/:id', authorize(...CAN_UPDATE), asyncHandler(transactionController.update.bind(transactionController)));
// No delete: transactions are voided so the ledger keeps its history.
router.post('/:id/void', authorize(...CAN_DELETE), asyncHandler(transactionController.void.bind(transactionController)));

export default router;
