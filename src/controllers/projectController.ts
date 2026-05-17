import { Response, NextFunction } from 'express';

import { Project } from '../models/Project';
import { User } from '../models/User';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

const resolveUserIdsByEmails = async (
  emails: string[] | undefined,
  allowedRoles: Array<'manager' | 'member'>
) => {
  if (!emails?.length) return [];

  const normalized = [
    ...new Set(
      emails
        .map((email) => email?.trim().toLowerCase())
        .filter(Boolean) as string[]
    ),
  ];

  const users = await User.find({
    email: { $in: normalized },
    role: { $in: allowedRoles },
  }).select('_id email role');

  if (users.length !== normalized.length) {
    const found = new Set(users.map((user) => user.email));
    const missing = normalized.filter((email) => !found.has(email));
    throw new AppError(
      `Invalid or unauthorized users: ${missing.join(', ')}`,
      400
    );
  }

  return users.map((user) => user._id);
};

export const getProjects = catchAsync(
  async (req: AuthRequest, res: Response) => {
    let filter = {};

    if (req.user.role === 'manager') {
      filter = { managers: req.user._id };
    } else if (req.user.role === 'member') {
      filter = { members: req.user._id };
    }

    const projects = await Project.find(filter)
      .populate('owner', 'name email role')
      .populate('managers', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: projects.length,
      data: projects,
    });
  }
);

export const createProject = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Permission denied', 403));
    }

    const managerIds = await resolveUserIdsByEmails(
      req.body.managerEmails,
      ['manager']
    );

    const memberIds = await resolveUserIdsByEmails(
      req.body.memberEmails,
      ['member']
    );

    const project = await Project.create({
      name: req.body.name,
      description: req.body.description,
      owner: req.user._id,
      managers: managerIds,
      members: memberIds,
      status: req.body.status || 'active',
    });

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('managers', 'name email role')
      .populate('members', 'name email role');

    res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: populated,
    });
  }
);

export const updateProject = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Permission denied', 403));
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    if (req.body.name !== undefined) project.name = req.body.name;
    if (req.body.description !== undefined) {
      project.description = req.body.description;
    }
    if (req.body.status !== undefined) project.status = req.body.status;

    if (req.body.managerEmails !== undefined) {
      project.managers = await resolveUserIdsByEmails(
        req.body.managerEmails,
        ['manager']
      );
    }

    if (req.body.memberEmails !== undefined) {
      project.members = await resolveUserIdsByEmails(
        req.body.memberEmails,
        ['member']
      );
    }

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('managers', 'name email role')
      .populate('members', 'name email role');

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: populated,
    });
  }
);

export const deleteProject = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== 'admin') {
      return next(new AppError('Permission denied', 403));
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    await project.deleteOne();

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }
);
