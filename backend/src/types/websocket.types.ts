import { ITask } from './task.types';

export enum WebSocketEventType {
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
  TASK_LOCKED = 'task:locked',
  TASK_UNLOCKED = 'task:unlocked',
  ERROR = 'error',
  CONNECTED = 'connected'
}

export interface IWebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp?: Date;
}

export interface ITaskCreatedPayload {
  task: ITask;
}

export interface ITaskUpdatedPayload {
  task: ITask;
}

export interface ITaskDeletedPayload {
  taskId: string;
}

export interface ITaskLockedPayload {
  taskId: string;
  lockedBy: string;
  lockedAt: Date;
}

export interface ITaskUnlockedPayload {
  taskId: string;
}

export interface IErrorPayload {
  message: string;
  code?: string;
}

export interface IConnectedPayload {
  message: string;
  userId: string;
}
