import { Schema, model } from 'mongoose';

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    managers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    }
  },
  { timestamps: true }
);

export const Project = model('Project', projectSchema);