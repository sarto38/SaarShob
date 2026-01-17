import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import {
  WebSocketEventType,
  IWebSocketMessage,
  IErrorPayload,
  ITaskCreatedPayload,
  ITaskUpdatedPayload,
  ITaskDeletedPayload,
  ITaskLockedPayload,
  ITaskUnlockedPayload
} from '../types/websocket.types';
import { ITask } from '../types/task.types';
import { getJwtConfig } from '../config/jwt.config';

interface IAuthenticatedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  isAlive: boolean;
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, IAuthenticatedClient> = new Map();

  constructor() {
  }

  private get jwtSecret(): string {
    return getJwtConfig().secret;
  }

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      let clientId: string | null = null;

      // Extract token from query string or headers
      let token: string | null = null;
      
      // Try to get token from query string first (WebSocket standard way)
      if (req.url) {
        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          token = url.searchParams.get('token');
          // Note: searchParams.get() automatically decodes URL-encoded values
          // So if the frontend uses encodeURIComponent, it will be decoded here automatically
        } catch (urlError) {
          console.error('Error parsing WebSocket URL:', urlError);
        }
      }
      
      // Fallback to Authorization header (some WebSocket clients support this)
      if (!token && req.headers.authorization) {
        const authHeader = Array.isArray(req.headers.authorization) 
          ? req.headers.authorization[0] 
          : req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        }
      }

      if (!token) {
        this.sendError(ws, 'Authentication token required');
        ws.close();
        return;
      }

      // Clean and trim the token
      token = token.trim();

      // Validate token format (JWT has 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid JWT token format. Expected 3 parts, got:', tokenParts.length);
        console.error('Token preview:', token.substring(0, 20) + '...' + token.substring(token.length - 20));
        this.sendError(ws, 'Invalid token format');
        ws.close();
        return;
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, this.jwtSecret) as {
          userId: string;
          username: string;
          email: string;
        };

        clientId = `${decoded.userId}-${Date.now()}`;
        this.clients.set(clientId, {
          ws,
          userId: decoded.userId,
          username: decoded.username,
          isAlive: true
        });

        // Send connection confirmation
        this.sendMessage(ws, {
          type: WebSocketEventType.CONNECTED,
          payload: {
            message: 'Connected successfully',
            userId: decoded.userId
          },
          timestamp: new Date()
        });

        // Handle incoming messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            // Handle different message types if needed
            console.log('Received WebSocket message:', data);
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        });

        // Handle pong for keep-alive
        ws.on('pong', () => {
          if (clientId) {
            const client = this.clients.get(clientId);
            if (client) {
              client.isAlive = true;
            }
          }
        });

        // Handle close
        ws.on('close', () => {
          if (clientId) {
            this.clients.delete(clientId);
          }
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          if (clientId) {
            this.clients.delete(clientId);
          }
        });

        // Set up ping interval for keep-alive
        const interval = setInterval(() => {
          if (clientId) {
            const client = this.clients.get(clientId);
            if (client && !client.isAlive) {
              ws.terminate();
              this.clients.delete(clientId);
              clearInterval(interval);
              return;
            }
            if (client) {
              client.isAlive = false;
              ws.ping();
            }
          } else {
            clearInterval(interval);
          }
        }, 30000);

      } catch (error: any) {
        console.error('WebSocket authentication error:', error.message || error);
        if (error.name === 'JsonWebTokenError') {
          const errorMsg = error.message || 'Unknown JWT error';
          console.error('JWT Error details:', {
            name: error.name,
            message: errorMsg,
            tokenLength: token.length,
            tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
            secretLength: this.jwtSecret.length
          });
          
          // Provide helpful error message for common issues
          if (errorMsg.includes('invalid signature')) {
            console.error('💡 Tip: This usually means the token was signed with a different secret.');
            console.error('   Solution: Log out and log back in to get a fresh token.');
          }
        }
        this.sendError(ws, 'Invalid or expired token. Please log out and log back in.');
        ws.close();
      }
    });
  }

  broadcast(message: IWebSocketMessage, excludeUserId?: string): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (excludeUserId && client.userId === excludeUserId) {
        return;
      }
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  sendMessage(ws: WebSocket, message: IWebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws: WebSocket, errorMessage: string, code?: string): void {
    const payload: IErrorPayload = {
      message: errorMessage,
      code
    };
    this.sendMessage(ws, {
      type: WebSocketEventType.ERROR,
      payload,
      timestamp: new Date()
    });
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  broadcastTaskCreated(task: ITask, excludeUserId?: string): void {
    const payload: ITaskCreatedPayload = { task };
    this.broadcast(
      {
        type: WebSocketEventType.TASK_CREATED,
        payload,
        timestamp: new Date()
      },
      excludeUserId
    );
  }

  broadcastTaskUpdated(task: ITask, excludeUserId?: string): void {
    const payload: ITaskUpdatedPayload = { task };
    this.broadcast(
      {
        type: WebSocketEventType.TASK_UPDATED,
        payload,
        timestamp: new Date()
      },
      excludeUserId
    );
  }

  broadcastTaskDeleted(taskId: string, excludeUserId?: string): void {
    const payload: ITaskDeletedPayload = { taskId };
    this.broadcast(
      {
        type: WebSocketEventType.TASK_DELETED,
        payload,
        timestamp: new Date()
      },
      excludeUserId
    );
  }

  broadcastTaskLocked(taskId: string, lockedBy: string, username: string, excludeUserId?: string): void {
    const payload: ITaskLockedPayload = {
      taskId,
      lockedBy: { _id: lockedBy, username },
      lockedAt: new Date()
    };
    this.broadcast(
      {
        type: WebSocketEventType.TASK_LOCKED,
        payload,
        timestamp: new Date()
      },
      excludeUserId
    );
  }

  broadcastTaskUnlocked(taskId: string, excludeUserId?: string): void {
    const payload: ITaskUnlockedPayload = { taskId };
    this.broadcast(
      {
        type: WebSocketEventType.TASK_UNLOCKED,
        payload,
        timestamp: new Date()
      },
      excludeUserId
    );
  }
}
