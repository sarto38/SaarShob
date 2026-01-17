export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: Date | string;
  lockedBy?: any;
  lockedAt?: Date | string;
  createdBy: any;
  updatedBy?: any;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date | string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: Date | string;
}
