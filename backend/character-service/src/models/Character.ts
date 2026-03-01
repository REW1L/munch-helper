import { mongoose } from '../db';

interface CharacterDocument {
  roomId: string;
  userId: string | null;
  name: string;
  avatarId: number;
  level: number;
  power: number;
  class: string;
  race: string;
  gender: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const characterSchema = new mongoose.Schema<CharacterDocument>(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    avatarId: {
      type: Number,
      required: true
    },
    level: {
      type: Number,
      default: 1
    },
    power: {
      type: Number,
      default: 0
    },
    class: {
      type: String,
      default: ''
    },
    race: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Character = mongoose.model<CharacterDocument>('Character', characterSchema);