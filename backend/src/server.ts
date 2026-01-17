import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import { initializeTaskRoutes } from './routes/task.routes';
import { WebSocketHandler } from './websocket/websocket.handler';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket handler (singleton instance for broadcasting)
const websocketHandler = new WebSocketHandler();
websocketHandler.initialize(server);

// Export websocket handler for use in controllers
export { websocketHandler };

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', initializeTaskRoutes(websocketHandler));

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Connect to database
connectDatabase()
  .then(() => {
    // Start server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is ready`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

export default app;
