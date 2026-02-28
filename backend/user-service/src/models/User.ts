import { mongoose } from '../db';

interface UserDocument {
  name: string;
  avatarId: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    avatarId: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User = mongoose.model<UserDocument>('User', userSchema);