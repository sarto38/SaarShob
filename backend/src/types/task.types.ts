export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface ITask {
  _id?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: Date;
  lockedBy?: any; // Can be string or populated User
  lockedAt?: Date;
  createdBy: any; // Can be string or populated User
  updatedBy?: any; // Can be string or populated User
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}

export interface IUpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: Date;
}
