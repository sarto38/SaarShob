import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Task } from '../../shared/models/task.model';

export enum WebSocketEventType {
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
  TASK_LOCKED = 'task:locked',
  TASK_UNLOCKED = 'task:unlocked',
  ERROR = 'error',
  CONNECTED = 'connected'
}

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private isConnecting = false;

  private taskCreatedSubject = new Subject<Task>();
  public taskCreated$ = this.taskCreatedSubject.asObservable();

  private taskUpdatedSubject = new Subject<Task>();
  public taskUpdated$ = this.taskUpdatedSubject.asObservable();

  private taskDeletedSubject = new Subject<string>();
  public taskDeleted$ = this.taskDeletedSubject.asObservable();

  private taskLockedSubject = new Subject<{ taskId: string; lockedBy: any }>();
  public taskLocked$ = this.taskLockedSubject.asObservable();

  private taskUnlockedSubject = new Subject<string>();
  public taskUnlocked$ = this.taskUnlockedSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private authService: AuthService) {
    // Automatically manage connection based on auth state
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('No authentication token available');
      this.isConnecting = false;
      return;
    }

    try {
      // Note: encodeURIComponent is needed for JWT tokens in query strings
      // The backend's URL.searchParams.get() will automatically decode it
      const encodedToken = encodeURIComponent(token);
      const wsUrl = `${environment.wsUrl}?token=${encodedToken}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionStatusSubject.next(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.connectionStatusSubject.next(false);
        // If authentication fails, the token might be invalid
        // The backend will close the connection with an error message
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.connectionStatusSubject.next(false);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case WebSocketEventType.TASK_CREATED:
        this.taskCreatedSubject.next(message.payload.task);
        break;
      case WebSocketEventType.TASK_UPDATED:
        this.taskUpdatedSubject.next(message.payload.task);
        break;
      case WebSocketEventType.TASK_DELETED:
        this.taskDeletedSubject.next(message.payload.taskId);
        break;
      case WebSocketEventType.TASK_LOCKED:
        this.taskLockedSubject.next({
          taskId: message.payload.taskId,
          lockedBy: message.payload.lockedBy
        });
        break;
      case WebSocketEventType.TASK_UNLOCKED:
        this.taskUnlockedSubject.next(message.payload.taskId);
        break;
      case WebSocketEventType.CONNECTED:
        console.log('WebSocket connection confirmed:', message.payload);
        break;
      case WebSocketEventType.ERROR:
        console.error('WebSocket error:', message.payload);
        // If it's an authentication error, suggest re-login
        if (message.payload?.message?.includes('Invalid or expired token')) {
          console.warn('💡 WebSocket authentication failed. Please log out and log back in.');
        }
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }
}
