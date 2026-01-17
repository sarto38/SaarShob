import { BaseRepository } from './base.repository';
import { TaskModel, ITaskDocument } from '../models/task.model';
import { ICreateTaskDto, IUpdateTaskDto } from '../types/task.types';

export class TaskRepository extends BaseRepository<ITaskDocument> {
  constructor() {
    super(TaskModel);
  }

  async createTask(data: ICreateTaskDto, userId: string): Promise<ITaskDocument> {
    const task = await this.create({
      ...data,
      createdBy: userId,
      updatedBy: userId,
      completed: false
    } as Partial<ITaskDocument>);
    return await task.populate(['createdBy', 'updatedBy']);
  }

  async findAllTasks(): Promise<ITaskDocument[]> {
    return await this.model.find().populate(['createdBy', 'updatedBy', 'lockedBy']).sort({ createdAt: -1 });
  }

  async updateTask(
    taskId: string, 
    data: IUpdateTaskDto, 
    userId?: string,
    unlock: boolean = false
  ): Promise<ITaskDocument | null> {
    const updateData: any = { ...data };
    if (userId) {
      updateData.updatedBy = userId;
    }

    // Atomic update: only update if not locked by someone else
    // If locked by current user, it's fine. If not locked, it's fine.
    const query: any = { _id: taskId };
    if (userId) {
      query.$or = [
        { lockedBy: userId },
        { lockedBy: { $exists: false } },
        { lockedBy: null }
      ];
    }

    const update: any = { $set: updateData };
    if (unlock) {
      update.$unset = { lockedBy: '', lockedAt: '' };
    }

    const updatedTask = await this.model.findOneAndUpdate(
      query,
      update,
      { new: true }
    ).populate(['createdBy', 'updatedBy', 'lockedBy']);
    return updatedTask;
  }

  async lockTask(taskId: string, userId: string): Promise<ITaskDocument | null> {
    // Atomic lock: only lock if not currently locked or if lock has expired
    // The expiry check is handled in the Service, but for extra safety 
    // we can ensure we don't overwrite another active lock here.
    return await this.model.findOneAndUpdate(
      {
        _id: taskId,
        $or: [
          { lockedBy: { $exists: false } },
          { lockedBy: null },
          { lockedBy: userId }
        ]
      },
      { $set: { lockedBy: userId, lockedAt: new Date() } },
      { new: true }
    ).populate(['createdBy', 'updatedBy', 'lockedBy']);
  }

  async unlockTask(taskId: string, userId?: string): Promise<ITaskDocument | null> {
    const query: any = { _id: taskId };
    if (userId) {
      // Only allow unlocking if the user holds the lock OR it's already unlocked
      query.$or = [
        { lockedBy: userId },
        { lockedBy: { $exists: false } },
        { lockedBy: null }
      ];
    }

    return await this.model.findOneAndUpdate(
      query,
      { $unset: { lockedBy: '', lockedAt: '' } },
      { new: true }
    ).populate(['createdBy', 'updatedBy', 'lockedBy']);
  }

  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({
      _id: taskId,
      $or: [
        { lockedBy: userId },
        { lockedBy: { $exists: false } },
        { lockedBy: null }
      ]
    }).exec();
    return result !== null;
  }

  async isTaskLocked(taskId: string): Promise<boolean> {
    const task = await this.findById(taskId);
    if (!task) return false;
    return !!(task.lockedBy && task.lockedAt);
  }

  async isTaskLockedByUser(taskId: string, userId: string): Promise<boolean> {
    const task = await this.findById(taskId);
    if (!task) return false;
    return task.lockedBy?.toString() === userId;
  }
}
