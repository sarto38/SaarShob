import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITask, TaskPriority } from '../types/task.types';

export interface ITaskDocument extends ITask, Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    completed: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM
    },
    dueDate: {
      type: Date
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    lockedAt: {
      type: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
taskSchema.index({ createdBy: 1 });
taskSchema.index({ updatedBy: 1 });
taskSchema.index({ completed: 1 });
taskSchema.index({ lockedBy: 1 });
taskSchema.index({ createdAt: -1 });

export const TaskModel: Model<ITaskDocument> = mongoose.model<ITaskDocument>('Task', taskSchema);
