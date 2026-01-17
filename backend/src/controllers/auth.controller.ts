import { Response } from 'express';
import { IAuthenticatedRequest } from '../types/express.types';
import { AuthService } from '../services/auth.service';
import { ICreateUserDto, ILoginDto } from '../types/user.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userData: ICreateUserDto = req.body;
      const result = await this.authService.register(userData);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  };

  login = async (req: IAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const loginData: ILoginDto = req.body;
      const result = await this.authService.login(loginData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message || 'Login failed' });
    }
  };
}
