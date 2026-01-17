import { Response, NextFunction } from 'express';
import { IAuthenticatedRequest } from '../types/express.types';
import { TaskRepository } from '../repositories/task.repository';

const taskRepository = new TaskRepository();

export const lockMiddleware = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!id) {
      res.status(400).json({ message: 'Task ID is required' });
      return;
    }

    const task = await taskRepository.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Check if task is locked by another user
    if (task.lockedBy && task.lockedBy.toString() !== userId) {
      // Check if lock has expired (5 minutes)
      if (task.lockedAt) {
        const lockAge = Date.now() - task.lockedAt.getTime();
        const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
        
        if (lockAge > LOCK_TIMEOUT_MS) {
          // Lock expired, continue
          next();
          return;
        }
      }
      
      res.status(409).json({ 
        message: 'Task is currently being edited by another user',
        lockedBy: task.lockedBy
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error checking task lock' });
  }
};
