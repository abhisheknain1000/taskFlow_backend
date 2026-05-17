import { Response, NextFunction } from 'express';

import { User } from '../models/User';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getAssignableUsers = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    let roles: Array<'manager' | 'member'> = [];

    if (req.user.role === 'admin') {
      roles = ['manager', 'member'];
    } else if (req.user.role === 'manager') {
      roles = ['member'];
    } else {
      return next(new AppError('Permission denied', 403));
    }

    const users = await User.find({
      role: { $in: roles },
    })
      .select('name email role')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: users,
    });
  }
);
