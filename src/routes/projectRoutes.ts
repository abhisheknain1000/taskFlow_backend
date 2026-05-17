import { Router } from 'express';

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';

import { protect, restrictTo } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get(
  '/',
  restrictTo('admin', 'manager', 'member'),
  getProjects
);

router.post('/', restrictTo('admin'), createProject);

router.patch('/:id', restrictTo('admin'), updateProject);

router.delete('/:id', restrictTo('admin'), deleteProject);

export default router;
