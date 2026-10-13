import { Router } from 'express';
import { invitationController } from '../../controllers/invitationController';
import { authenticate, authorize, requireOrganization } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// Public: the invite link itself is the credential.
router.get('/token/:token', asyncHandler(invitationController.preview));
router.post('/token/:token/accept', asyncHandler(invitationController.acceptAsNewUser));

// Signed in: an existing user accepting an invite addressed to them.
router.post('/token/:token/join', authenticate, asyncHandler(invitationController.acceptAsExistingUser));

// Admin management of the current organization's invitations.
const admin = [authenticate, requireOrganization, authorize('admin')];
router.get('/', ...admin, asyncHandler(invitationController.getAll));
router.post('/', ...admin, asyncHandler(invitationController.create));
router.delete('/:id', ...admin, asyncHandler(invitationController.revoke));

export default router;
