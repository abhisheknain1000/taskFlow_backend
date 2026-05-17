import { Router } from 'express';

import { getAssignableUsers } from '../controllers/userController';
import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get(
  '/assignable',
  restrictTo('admin', 'manager'),
  getAssignableUsers
);

export default router;
