import { BaseRepository } from './base.repository';
import { UserModel, IUserDocument } from '../models/user.model';
import { ICreateUserDto } from '../types/user.types';

export class UserRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(UserModel);
  }

  async createUser(data: ICreateUserDto): Promise<IUserDocument> {
    return await this.create(data as Partial<IUserDocument>);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return await this.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username: string): Promise<IUserDocument | null> {
    return await this.findOne({ username });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return await super.findById(id);
  }
}
