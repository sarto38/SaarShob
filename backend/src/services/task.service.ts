import { TaskRepository } from '../repositories/task.repository';
import { ITaskDocument } from '../models/task.model';
import { ICreateTaskDto, IUpdateTaskDto } from '../types/task.types';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class TaskService {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  async createTask(data: ICreateTaskDto, userId: string): Promise<ITaskDocument> {
    return await this.taskRepository.createTask(data, userId);
  }

  async getAllTasks(): Promise<ITaskDocument[]> {
    return await this.taskRepository.findAllTasks();
  }

  async getTaskById(taskId: string): Promise<ITaskDocument | null> {
    return await this.taskRepository.findById(taskId);
  }

  async updateTask(
    taskId: string,
    data: IUpdateTaskDto,
    userId: string
  ): Promise<ITaskDocument | null> {
    // Check if task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check if task is locked by another user
    if (task.lockedBy && task.lockedBy.toString() !== userId) {
      // Check if lock has expired
      if (task.lockedAt) {
        const lockAge = Date.now() - task.lockedAt.getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
          // Lock expired, can proceed
          await this.taskRepository.unlockTask(taskId);
        } else {
          throw new Error('Task is currently being edited by another user');
        }
      } else {
        throw new Error('Task is currently being edited by another user');
      }
    }

    // Update task and unlock atomically
    const updatedTask = await this.taskRepository.updateTask(taskId, data, userId, true);

    if (!updatedTask) {
      throw new Error('Task is currently being edited by another user or has been modified');
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    // Check if task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check if task is locked by another user
    if (task.lockedBy && task.lockedBy.toString() !== userId) {
      if (task.lockedAt) {
        const lockAge = Date.now() - task.lockedAt.getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
          // Lock expired, can proceed
        } else {
          throw new Error('Task is currently being edited by another user');
        }
      } else {
        throw new Error('Task is currently being edited by another user');
      }
    }

    // Use a more robust delete that respects the lock
    return await this.taskRepository.deleteTask(taskId, userId);
  }

  async lockTask(taskId: string, userId: string): Promise<ITaskDocument | null> {
    // Check if task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check if task is already locked
    if (task.lockedBy && task.lockedBy.toString() !== userId) {
      // Check if lock has expired
      if (task.lockedAt) {
        const lockAge = Date.now() - task.lockedAt.getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
          // Lock expired, can acquire lock
          // Force unlock first to be sure
          await this.taskRepository.unlockTask(taskId);
        } else {
          throw new Error('Task is currently being edited by another user');
        }
      } else {
        throw new Error('Task is currently being edited by another user');
      }
    }

    // Lock the task atomically
    const lockedTask = await this.taskRepository.lockTask(taskId, userId);
    if (!lockedTask) {
      throw new Error('Task is currently being edited by another user');
    }
    return lockedTask;
  }

  async unlockTask(taskId: string, userId: string): Promise<ITaskDocument | null> {
    // Check if task exists
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Only unlock if locked by this user
    return await this.taskRepository.unlockTask(taskId, userId);
  }

  async cleanupExpiredLocks(): Promise<void> {
    // This could be called periodically to clean up expired locks
    const tasks = await this.taskRepository.findAll({});
    const now = Date.now();

    for (const task of tasks) {
      if (task.lockedAt) {
        const lockAge = now - task.lockedAt.getTime();
        if (lockAge > LOCK_TIMEOUT_MS) {
          await this.taskRepository.unlockTask(task._id.toString());
        }
      }
    }
  }
}
