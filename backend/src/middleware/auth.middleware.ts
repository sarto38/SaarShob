import { Response, NextFunction } from 'express';
import { IAuthenticatedRequest } from '../types/express.types';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const authMiddleware = (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Express normalizes headers to lowercase, but handle both cases
    const authHeader = req.headers.authorization || req.headers['Authorization'];
    
    // Handle case where header might be an array (shouldn't happen, but TypeScript requires it)
    const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    
    if (!authHeaderValue || !authHeaderValue.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeaderValue.substring(7).trim(); // Remove 'Bearer ' prefix and trim whitespace
    
    if (!token) {
      res.status(401).json({ message: 'Token is empty' });
      return;
    }

    const decoded = authService.verifyToken(token);

    req.user = {
      _id: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };

    next();
  } catch (error: any) {
    res.status(401).json({ message: error.message || 'Invalid token' });
  }
};
