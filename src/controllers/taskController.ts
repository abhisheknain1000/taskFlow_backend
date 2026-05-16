import { Response, NextFunction } from 'express';

import { Task } from '../models/Task';
import { User } from '../models/User';

import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

import { AuthRequest } from '../middlewares/authMiddleware';


// CREATE TASK
    export const createTask = catchAsync(
    async (req: AuthRequest, res: Response, next: NextFunction) => {

        // Only admin or manager can create tasks

        console.log(req.user.role);
        if (
        req.user.role !== 'admin' &&
        req.user.role !== 'manager'
        ) {
        return next(
            new AppError('Permission denied', 403)
        );
        }

        const assignedEmail = req.body.assignedTo
        ?.trim()
        .toLowerCase();
    
    if (!assignedEmail) {
        return next(
            new AppError('Assigned email is required', 400)
        );
    }
    
    const assignedUser = await User.findOne({
        email: assignedEmail
    });   

        if (!assignedUser) {
        console.error(`User not found with email: ${assignedEmail}`);
        return next(
            new AppError(`Member with email ${assignedEmail} not found`, 404)
        );
        }

        const task = await Task.create({
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        status: req.body.status,
        deadline: req.body.deadline,

        createdBy: req.user._id,

        assignedTo: assignedUser._id  
        });

        res.status(201).json({
        status: 'success',
        message: 'Task created successfully',
        data: task
        });
    }
);


// GET TASKS
export const getTasks = catchAsync(
  async (req: AuthRequest, res: Response) => {

    let query = {};

    // ADMIN → all tasks
    if (req.user.role === 'admin') {

      query = {
        archived: false
      };

    }

    // MANAGER → only tasks created by them
    else if (req.user.role === 'manager') {

      query = {
        createdBy: req.user._id,
        archived: false
      };

    }

    // MEMBER → only assigned tasks
    else {

      query = {
        assignedTo: req.user._id,
        archived: false
      };

    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: tasks
    });
  }
);


// UPDATE TASK
export const updateTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {

    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(
        new AppError('Task not found', 404)
      );
    }

    // ADMIN → full access
    if (req.user.role === 'admin') {

      const allowedFields = [
        'title',
        'description',
        'priority',
        'status',
        'deadline'
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          (task as any)[field] = req.body[field];
        }
      });

    }

    // MANAGER → only tasks created by them
    else if (req.user.role === 'manager') {

      if (
        task.createdBy.toString() !==
        req.user._id.toString()
      ) {
        return next(
          new AppError('Permission denied', 403)
        );
      }

      const allowedFields = [
        'title',
        'description',
        'priority',
        'status',
        'deadline'
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          (task as any)[field] = req.body[field];
        }
      });

    }

    // MEMBER → only status update
    else {

      if (
        task.assignedTo.toString() !==
        req.user._id.toString()
      ) {
        return next(
          new AppError('Permission denied', 403)
        );
      }

      if (!req.body.status) {
        return next(
          new AppError('Status is required', 400)
        );
      }

      const allowedStatuses = [
        'todo',
        'in-progress',
        'completed'
      ];

      if (
        !allowedStatuses.includes(req.body.status)
      ) {
        return next(
          new AppError('Invalid status value', 400)
        );
      }

      task.status = req.body.status;
    }

    await task.save();

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: task
    });
  }
);


// DELETE TASK
export const deleteTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {

    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(
        new AppError('Task not found', 404)
      );
    }

    // ADMIN → can delete everything
    if (req.user.role === 'admin') {

      await task.deleteOne();

    }

    // MANAGER → only own created tasks
    else if (req.user.role === 'manager') {

      if (
        task.createdBy.toString() !==
        req.user._id.toString()
      ) {
        return next(
          new AppError('Permission denied', 403)
        );
      }

      await task.deleteOne();

    }

    // MEMBER → cannot delete
    else {

      return next(
        new AppError('Permission denied', 403)
      );

    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  }
);


// ARCHIVE TASK
export const archiveTask = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {

    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(
        new AppError('Task not found', 404)
      );
    }

    if (task.status !== 'completed') {
      return next(
        new AppError(
          'Only completed tasks can be archived',
          400
        )
      );
    }

    // ADMIN → can archive all tasks
    if (req.user.role === 'admin') {

      task.archived = true;

    }

    // MANAGER → only own created tasks
    else if (req.user.role === 'manager') {

      if (
        task.createdBy.toString() !==
        req.user._id.toString()
      ) {
        return next(
          new AppError('Permission denied', 403)
        );
      }

      task.archived = true;

    }

    // MEMBER → cannot archive
    else {

      return next(
        new AppError('Permission denied', 403)
      );

    }

    await task.save();

    res.status(200).json({
      status: 'success',
      message: 'Task archived successfully',
      data: task
    });
  }
);