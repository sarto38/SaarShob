export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
}

export interface ICreateUserDto {
  username: string;
  email: string;
  password: string;
}

export interface ILoginDto {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: {
    _id: string;
    username: string;
    email: string;
  };
}
