import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

/**
 * POST /api/auth/verify
 * Verify Firebase token and check allowlist
 */
router.post('/verify', authController.verifyToken);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, authController.getCurrentUser);

/**
 * POST /api/auth/logout
 * Logout (client-side token cleanup, server can revoke if needed)
 */
router.post('/logout', optionalAuth, authController.logout);

export default router;
