import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/http';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/verify', asyncHandler(authController.verifyToken));
router.get('/me', requireAuth, asyncHandler(authController.getCurrentUser));
router.post('/logout', optionalAuth, asyncHandler(authController.logout));
router.get('/dev-accounts', asyncHandler(authController.listDevAccounts));

export default router;
