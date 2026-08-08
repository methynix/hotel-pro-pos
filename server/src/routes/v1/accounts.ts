import { Router } from 'express';
import { accountController } from '../../controllers/accountController';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(accountController.getAll.bind(accountController)));
router.post('/', asyncHandler(accountController.create.bind(accountController)));
router.patch('/:id', asyncHandler(accountController.update.bind(accountController)));
router.delete('/:id', asyncHandler(accountController.delete.bind(accountController)));

export default router;
