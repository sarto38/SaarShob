import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from '../types/user.types';

export interface IUserDocument extends IUser, Document {
  _id: string;
  createdAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
