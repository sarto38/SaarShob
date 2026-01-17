import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '../models/user.model';
import { ILoginDto, IAuthResponse, ICreateUserDto } from '../types/user.types';
import { UserRepository } from '../repositories/user.repository';
import { getJwtConfig } from '../config/jwt.config';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  private get jwtSecret(): string {
    return getJwtConfig().secret;
  }

  private get jwtExpiresIn(): string {
    return getJwtConfig().expiresIn;
  }

  async register(userData: ICreateUserDto): Promise<IAuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await this.userRepository.findByUsername(userData.username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await this.userRepository.createUser({
      ...userData,
      password: hashedPassword
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    };
  }

  async login(loginData: ILoginDto): Promise<IAuthResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    };
  }

  verifyToken(token: string): { userId: string; email: string; username: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as {
        userId: string;
        email: string;
        username: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  private generateToken(user: IUserDocument): string {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    } as SignOptions);
  }
}
