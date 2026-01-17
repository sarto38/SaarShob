import { Request } from 'express';
import { IUser } from './user.types';

export interface IAuthenticatedRequest extends Request {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
}
