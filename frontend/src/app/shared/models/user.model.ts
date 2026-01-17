export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
