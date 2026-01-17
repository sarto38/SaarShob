import { Response } from 'express';
import { IAuthenticatedRequest } from '../types/express.types';
import { TaskService } from '../services/task.service';
import { ICreateTaskDto, IUpdateTaskDto } from '../types/task.types';
import { WebSocketHandler } from '../websocket/websocket.handler';

export class TaskController {
  private taskService: TaskService;
  private websocketHandler: WebSocketHandler;

  constructor(websocketHandler: WebSocketHandler) {
    this.taskService = new TaskService();
    this.websocketHandler = websocketHandler;
  }

  getAllTasks = async (_req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tasks = await this.taskService.getAllTasks();
      res.status(200).json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch tasks' });
    }
  };

  getTaskById = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const task = await this.taskService.getTaskById(id);
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }
      res.status(200).json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch task' });
    }
  };

  createTask = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const taskData: ICreateTaskDto = req.body;
      const userId = req.user!._id;
      const task = await this.taskService.createTask(taskData, userId);
      
      // Broadcast to all clients
      this.websocketHandler.broadcastTaskCreated(task.toObject(), userId);
      
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create task' });
    }
  };

  updateTask = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const taskData: IUpdateTaskDto = req.body;
      const userId = req.user!._id;
      const task = await this.taskService.updateTask(id, taskData, userId);
      
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Broadcast to all clients
      this.websocketHandler.broadcastTaskUpdated(task.toObject(), userId);
      
      res.status(200).json(task);
    } catch (error: any) {
      const statusCode = error.message.includes('locked') ? 409 : 500;
      res.status(statusCode).json({ message: error.message || 'Failed to update task' });
    }
  };

  deleteTask = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id;
      const deleted = await this.taskService.deleteTask(id, userId);
      
      if (!deleted) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Broadcast to all clients
      this.websocketHandler.broadcastTaskDeleted(id, userId);
      
      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error: any) {
      const statusCode = error.message.includes('locked') ? 409 : 500;
      res.status(statusCode).json({ message: error.message || 'Failed to delete task' });
    }
  };

  lockTask = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id;
      const username = req.user!.username;
      const task = await this.taskService.lockTask(id, userId);
      
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Broadcast to all clients
      this.websocketHandler.broadcastTaskLocked(id, userId, username, userId);
      
      res.status(200).json({ message: 'Task locked successfully', task });
    } catch (error: any) {
      const statusCode = error.message.includes('locked') ? 409 : 500;
      res.status(statusCode).json({ message: error.message || 'Failed to lock task' });
    }
  };

  unlockTask = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!._id;
      const task = await this.taskService.unlockTask(id, userId);
      
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      // Broadcast to all clients
      this.websocketHandler.broadcastTaskUnlocked(id, userId);
      
      res.status(200).json({ message: 'Task unlocked successfully', task });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to unlock task' });
    }
  };
}
