        import { Router } from 'express';

import {
  signup,
  login
} from '../controllers/authController';

import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();


// Rate limiter for auth routes
router.use(authLimiter);


// Public Routes
router.post('/signup', signup);

router.post('/login', login);


export default router;