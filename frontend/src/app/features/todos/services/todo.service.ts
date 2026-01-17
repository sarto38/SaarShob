import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, CreateTaskDto, UpdateTaskDto, TaskPriority } from '../../../shared/models/task.model';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private apiUrl = `${environment.apiUrl}/tasks`;
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  private priorityWeights: Record<string, number> = {
    [TaskPriority.HIGH]: 3,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 1
  };

  constructor(
    private http: HttpClient,
    private websocketService: WebSocketService,
    private authService: AuthService
  ) {
    this.initializeWebSocketListeners();
  }

  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const weightA = this.priorityWeights[a.priority] || 0;
      const weightB = this.priorityWeights[b.priority] || 0;
      
      if (weightA !== weightB) {
        return weightB - weightA; // High priority first
      }
      
      // Secondary sort by createdAt (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  private initializeWebSocketListeners(): void {
    // Listen for real-time updates
    this.websocketService.taskCreated$.subscribe(task => {
      const currentTasks = this.tasksSubject.value;
      this.tasksSubject.next(this.sortTasks([...currentTasks, task]));
    });

    this.websocketService.taskUpdated$.subscribe(updatedTask => {
      const currentTasks = this.tasksSubject.value;
      const index = currentTasks.findIndex(t => t._id === updatedTask._id);
      if (index !== -1) {
        currentTasks[index] = updatedTask;
        this.tasksSubject.next(this.sortTasks([...currentTasks]));
      }
    });

    this.websocketService.taskDeleted$.subscribe(taskId => {
      const currentTasks = this.tasksSubject.value.filter(t => t._id !== taskId);
      this.tasksSubject.next(this.sortTasks(currentTasks));
    });

    this.websocketService.taskLocked$.subscribe(({ taskId, lockedBy }) => {
      const currentTasks = [...this.tasksSubject.value];
      const index = currentTasks.findIndex(t => t._id === taskId);
      if (index !== -1) {
        currentTasks[index] = {
          ...currentTasks[index],
          lockedBy,
          lockedAt: new Date().toISOString()
        };
        this.tasksSubject.next(this.sortTasks(currentTasks));
      }
    });

    this.websocketService.taskUnlocked$.subscribe(taskId => {
      const currentTasks = [...this.tasksSubject.value];
      const index = currentTasks.findIndex(t => t._id === taskId);
      if (index !== -1) {
        currentTasks[index] = {
          ...currentTasks[index],
          lockedBy: undefined,
          lockedAt: undefined
        };
        this.tasksSubject.next(this.sortTasks(currentTasks));
      }
    });
  }

  loadTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl).pipe(
      tap(tasks => {
        this.tasksSubject.next(this.sortTasks(tasks));
      })
    );
  }

  getTaskById(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  createTask(taskData: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, taskData).pipe(
      tap(task => {
        // Task will be added via WebSocket, but we can also add it here for immediate UI update
        const currentTasks = this.tasksSubject.value;
        this.tasksSubject.next(this.sortTasks([...currentTasks, task]));
      })
    );
  }

  updateTask(id: string, taskData: UpdateTaskDto): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, taskData).pipe(
      tap(updatedTask => {
        // Task will be updated via WebSocket, but we can also update it here for immediate UI update
        const currentTasks = this.tasksSubject.value;
        const index = currentTasks.findIndex(t => t._id === id);
        if (index !== -1) {
          currentTasks[index] = updatedTask;
          this.tasksSubject.next(this.sortTasks([...currentTasks]));
        }
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Task will be removed via WebSocket, but we can also remove it here for immediate UI update
        const currentTasks = this.tasksSubject.value.filter(t => t._id !== id);
        this.tasksSubject.next(this.sortTasks(currentTasks));
      })
    );
  }

  lockTask(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/lock`, {});
  }

  unlockTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/lock`);
  }

  isTaskLocked(task: Task): boolean {
    if (!task.lockedBy) return false;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return true;
    
    const lockedByUserId = typeof task.lockedBy === 'object' ? task.lockedBy._id : task.lockedBy;
    
    // Check if lock has expired (5 minutes)
    if (task.lockedAt) {
      const lockTime = new Date(task.lockedAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - lockTime > fiveMinutes) {
        return false; // Lock expired
      }
    }
    
    return lockedByUserId !== currentUser._id;
  }

  canEditTask(task: Task): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    
    return !this.isTaskLocked(task);
  }
}
