import { Router } from 'express';

import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  archiveTask
} from '../controllers/taskController';

import {
  protect,
  restrictTo
} from '../middlewares/authMiddleware';

const router = Router();


// All logged-in users can access tasks routes
router.use(protect);


// GET TASKS
router.get(
  '/',
  restrictTo('admin', 'manager', 'member'),
  getTasks
);


// CREATE TASK  
router.post(
  '/',
  restrictTo('admin', 'manager'),
  createTask
);


// UPDATE TASK
router.patch(
  '/:id',
  restrictTo('admin', 'manager', 'member'),
  updateTask
);


// DELETE TASK
router.delete(
  '/:id',
  restrictTo('admin', 'manager'),
  deleteTask
);


// ARCHIVE TASK
router.patch(
  '/:id/archive',
  restrictTo('admin', 'manager'),
  archiveTask
);

export default router;  