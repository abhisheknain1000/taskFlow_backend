import { Schema, model } from 'mongoose';

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    status: {
      type: String,
      enum: ['todo', 'in-progress', 'completed'],
      default: 'todo'
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },

    deadline: {
      type: Date
    },

    archived: {
      type: Boolean,
      default: false
    },

    completedAt: {
      type: Date,
      default: null
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    }
  },
  { timestamps: true }
);


taskSchema.pre('save', function () {

  const task = this as any;

  if (task.isModified('status')) {

    if (task.status === 'completed') {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }
  }
});

export const Task = model('Task', taskSchema);