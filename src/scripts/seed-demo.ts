import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models/User';
import { Task } from '../models/Task';
import { Project } from '../models/Project';

const DEMO_PASSWORD = 'Demo1234!';

const demoUsers = [
  {
    name: 'Demo Admin',
    email: 'admin@demo.taskflow.com',
    role: 'admin' as const,
  },
  {
    name: 'Demo Manager',
    email: 'manager@demo.taskflow.com',
    role: 'manager' as const,
  },
  {
    name: 'Demo Member',
    email: 'member@demo.taskflow.com',
    role: 'member' as const,
  },
];

async function seed() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(uri);

  await Task.deleteMany({});
  await Project.deleteMany({});

  for (const demo of demoUsers) {
    await User.deleteOne({ email: demo.email });
    await User.create({
      ...demo,
      password: DEMO_PASSWORD,
    });
  }

  const admin = await User.findOne({ email: 'admin@demo.taskflow.com' });
  const manager = await User.findOne({ email: 'manager@demo.taskflow.com' });
  const member = await User.findOne({ email: 'member@demo.taskflow.com' });

  if (!admin || !manager || !member) {
    throw new Error('Failed to create demo users');
  }

  const project = await Project.create({
    name: 'Demo Workspace',
    description: 'Sample project for local testing',
    owner: admin._id,
    managers: [manager._id],
    members: [member._id],
    status: 'active',
  });

  await Task.create([
    {
      title: 'Admin task for manager',
      description: 'Manager should see this (created by admin)',
      priority: 'high',
      status: 'todo',
      createdBy: admin._id,
      assignedTo: manager._id,
      project: project._id,
    },
    {
      title: 'Manager task for member',
      description: 'Member should see this (created by manager)',
      priority: 'medium',
      status: 'todo',
      createdBy: manager._id,
      assignedTo: member._id,
      project: project._id,
    },
    {
      title: 'Admin task for member',
      description: 'Member should NOT see this in their list',
      priority: 'low',
      status: 'todo',
      createdBy: admin._id,
      assignedTo: member._id,
      project: project._id,
    },
  ]);

  console.log('Demo seed complete.');
  console.log('Accounts (password for all):', DEMO_PASSWORD);
  demoUsers.forEach((user) => {
    console.log(`- ${user.role}: ${user.email}`);
  });

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
