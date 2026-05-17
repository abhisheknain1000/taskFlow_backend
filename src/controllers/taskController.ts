import { Response, NextFunction } from 'express';

import { Task } from '../models/Task';
import { User } from '../models/User';

import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

import { AuthRequest } from '../middlewares/authMiddleware';

const populateOptions = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email role' },
  { path: 'project', select: 'name status' },
];

const getRoleUserIds = async (
  role: 'admin' | 'manager' | 'member'
) => User.find({ role }).distinct('_id');

const findUserByAssignEmail = async (email: string) => {
  const assignedEmail = email?.trim().toLowerCase();

  if (!assignedEmail) {
    throw new AppError('Assigned email is required', 400);
  }

  const assignedUser = await User.findOne({ email: assignedEmail });

  if (!assignedUser) {
    throw new AppError(
      `User with email ${assignedEmail} not found`,
      404
    );
  }

  return assignedUser;
};

const validateAssigneeForCreator = (
  creatorRole: string,
  assigneeRole: string
) => {
  if (creatorRole === 'admin') {
    if (!['manager', 'member'].includes(assigneeRole)) {
      throw new AppError(
        'Admin can only assign tasks to managers or members',
        400
      );
    }
    return;
  }

  if (creatorRole === 'manager') {
    if (assigneeRole !== 'member') {
      throw new AppError(
        'Managers can only assign tasks to members',
        400
      );
    }
  }
};

const isTaskOwnedByUser = (task: any, userId: string) =>
  task.createdBy.toString() === userId.toString();

// CREATE TASK
export const createTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'manager'
    ) {
      return next(new AppError('Permission denied', 403));
    }

    try {
      const assignedUser = await findUserByAssignEmail(req.body.assignedTo);
      validateAssigneeForCreator(req.user.role, assignedUser.role);

      const task = await Task.create({
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        status: req.body.status,
        deadline: req.body.deadline,
        project: req.body.project || undefined,
        createdBy: req.user._id,
        assignedTo: assignedUser._id,
      });

      const populated = await Task.findById(task._id).populate(populateOptions);

      res.status(201).json({
        status: 'success',
        message: 'Task created successfully',
        data: populated,
      });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      throw error;
    }
  }
);

// GET TASKS
export const getTasks = catchAsync(
  async (req: AuthRequest, res: Response) => {
    let query: Record<string, unknown> = {
      archived: false,
    };

    if (req.user.role === 'admin') {
      query = { archived: false };
    } else if (req.user.role === 'manager') {
      const adminIds = await getRoleUserIds('admin');

      query = {
        archived: false,
        $or: [
          { createdBy: req.user._id },
          { createdBy: { $in: adminIds } },
        ],
      };
    } else {
      const managerIds = await getRoleUserIds('manager');

      query = {
        archived: false,
        assignedTo: req.user._id,
        createdBy: { $in: managerIds },
      };
    }

    const tasks = await Task.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: tasks,
    });
  }
);

// UPDATE TASK
export const updateTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    if (req.user.role === 'admin') {
      const allowedFields = [
        'title',
        'description',
        'priority',
        'status',
        'deadline',
        'project',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          (task as any)[field] = req.body[field];
        }
      });

      if (req.body.assignedTo) {
        const assignedUser = await findUserByAssignEmail(req.body.assignedTo);
        validateAssigneeForCreator('admin', assignedUser.role);
        task.assignedTo = assignedUser._id;
      }
    } else if (req.user.role === 'manager') {
      if (!isTaskOwnedByUser(task, req.user._id)) {
        return next(
          new AppError(
            'Managers can only update tasks they created',
            403
          )
        );
      }

      const allowedFields = [
        'title',
        'description',
        'priority',
        'status',
        'deadline',
        'project',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          (task as any)[field] = req.body[field];
        }
      });

      if (req.body.assignedTo) {
        const assignedUser = await findUserByAssignEmail(req.body.assignedTo);
        validateAssigneeForCreator('manager', assignedUser.role);
        task.assignedTo = assignedUser._id;
      }
    } else {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return next(new AppError('Permission denied', 403));
      }

      if (!req.body.status) {
        return next(new AppError('Status is required', 400));
      }

      const allowedStatuses = ['todo', 'completed'];

      if (!allowedStatuses.includes(req.body.status)) {
        return next(
          new AppError(
            'Members can only set status to pending (todo) or completed',
            400
          )
        );
      }

      task.status = req.body.status;
    }

    await task.save();

    const populated = await Task.findById(task._id).populate(populateOptions);

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: populated,
    });
  }
);

// DELETE TASK
export const deleteTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    if (req.user.role === 'admin') {
      await task.deleteOne();
    } else if (req.user.role === 'manager') {
      if (!isTaskOwnedByUser(task, req.user._id)) {
        return next(new AppError('Permission denied', 403));
      }

      await task.deleteOne();
    } else {
      return next(new AppError('Permission denied', 403));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);

// ARCHIVE TASK
export const archiveTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    if (task.status !== 'completed') {
      return next(
        new AppError('Only completed tasks can be archived', 400)
      );
    }

    if (req.user.role === 'admin') {
      task.archived = true;
    } else if (req.user.role === 'manager') {
      if (!isTaskOwnedByUser(task, req.user._id)) {
        return next(new AppError('Permission denied', 403));
      }

      task.archived = true;
    } else {
      return next(new AppError('Permission denied', 403));
    }

    await task.save();

    const populated = await Task.findById(task._id).populate(populateOptions);

    res.status(200).json({
      status: 'success',
      message: 'Task archived successfully',
      data: populated,
    });
  }
);
