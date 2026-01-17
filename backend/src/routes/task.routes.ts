import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { lockMiddleware } from '../middleware/lock.middleware';
import { WebSocketHandler } from '../websocket/websocket.handler';

const router = Router();

export const initializeTaskRoutes = (wsHandler: WebSocketHandler): Router => {
  const taskController = new TaskController(wsHandler);

  // All task routes require authentication
  router.use(authMiddleware);

  // Get all tasks
  router.get('/', taskController.getAllTasks);

  // Get task by ID
  router.get('/:id', taskController.getTaskById);

  // Create task
  router.post('/', taskController.createTask);

  // Update task (requires lock check)
  router.put('/:id', lockMiddleware, taskController.updateTask);

  // Delete task (requires lock check)
  router.delete('/:id', lockMiddleware, taskController.deleteTask);

  // Lock task
  router.post('/:id/lock', taskController.lockTask);

  // Unlock task
  router.delete('/:id/lock', taskController.unlockTask);

  return router;
};

export default router;
