import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, CreateTaskDto, UpdateTaskDto } from '../../../shared/models/task.model';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * TodoService
 *
 * This service manages CRUD operations and state for tasks ("todos") within the application.
 * 
 * Responsibilities:
 * - Fetches, creates, updates, and deletes tasks via HTTP API calls.
 * - Maintains a real-time, observable list of tasks which is updated upon receiving WebSocket events
 *   (for task creation, updates, deletion, locking, unlocking), enabling live collaboration and feedback.
 * - Provides methods to determine lock status on tasks and whether the current user can edit a given task,
 *   supporting collaborative editing with lock-based access.
 * - Sorts tasks by priority and creation time for consistent UI presentation.
 */
@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private apiUrl = `${environment.apiUrl}/tasks`;
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  constructor(
    private http: HttpClient,
    private websocketService: WebSocketService,
    private authService: AuthService
  ) {
    this.initializeWebSocketListeners();
  }

  private initializeWebSocketListeners(): void {
    // Listen for real-time updates
    this.websocketService.taskCreated$.subscribe(task => {
      const currentTasks = this.tasksSubject.value;
      this.tasksSubject.next([...currentTasks, task]);
    });

    this.websocketService.taskUpdated$.subscribe(updatedTask => {
      const currentTasks = [...this.tasksSubject.value];
      const index = currentTasks.findIndex(t => t._id === updatedTask._id);
      if (index !== -1) {
        currentTasks[index] = updatedTask;
        this.tasksSubject.next(currentTasks);
      }
    });

    this.websocketService.taskDeleted$.subscribe(taskId => {
      const currentTasks = this.tasksSubject.value.filter(t => t._id !== taskId);
      this.tasksSubject.next(currentTasks);
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
        this.tasksSubject.next(currentTasks);
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
        this.tasksSubject.next(currentTasks);
      }
    });
  }

  loadTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl).pipe(
      tap(tasks => {
        this.tasksSubject.next(tasks);
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
        this.tasksSubject.next([...currentTasks, task]);
      })
    );
  }

  updateTask(id: string, taskData: UpdateTaskDto): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, taskData).pipe(
      tap(updatedTask => {
        // Task will be updated via WebSocket, but we can also update it here for immediate UI update
        const currentTasks = [...this.tasksSubject.value];
        const index = currentTasks.findIndex(t => t._id === id);
        if (index !== -1) {
          currentTasks[index] = updatedTask;
          this.tasksSubject.next(currentTasks);
        }
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Task will be removed via WebSocket, but we can also remove it here for immediate UI update
        const currentTasks = this.tasksSubject.value.filter(t => t._id !== id);
        this.tasksSubject.next(currentTasks);
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
