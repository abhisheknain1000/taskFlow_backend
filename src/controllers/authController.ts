import jwt, { type SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

const signToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '90d') as SignOptions['expiresIn'];
  return jwt.sign({ id }, secret, { expiresIn });
};

const toAuthUser = (user: { _id: { toString(): string }; name: string; email: string; role: string }) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

export const signup = catchAsync(async (req: any, res: any) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role
  });

  const token = signToken(newUser._id.toString());

  res.status(201).json({
    status: 'success',
    token,
    user: toAuthUser(newUser),
  });
});

export const login = catchAsync(async (req: any, res: any, next: any) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await (user as any).correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = signToken(user._id.toString());
  res.status(200).json({
    status: 'success',
    token,
    user: toAuthUser(user),
  });
});