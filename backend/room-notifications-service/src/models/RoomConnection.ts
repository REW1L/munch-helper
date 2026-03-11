import { mongoose } from '../db';

interface RoomConnectionDocument {
  connectionId: string;
  roomId: string;
  userId: string;
  connectedAt: Date;
  updatedAt: Date;
}

const roomConnectionSchema = new mongoose.Schema<RoomConnectionDocument>(
  {
    connectionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    roomId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    connectedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const RoomConnection = mongoose.model<RoomConnectionDocument>('RoomConnection', roomConnectionSchema);
