import { mongoose } from '../db';

interface RoomDocument {
  roomTypeId: 'munchkin';
  createdAt: Date;
  updatedAt: Date;
}

interface RoomAssociationDocument {
  roomId: string;
  userId: string;
  characterId: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new mongoose.Schema<RoomDocument>(
  {
    roomTypeId: {
      type: String,
      required: true,
      enum: ['munchkin'],
      default: 'munchkin'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const roomAssociationSchema = new mongoose.Schema<RoomAssociationDocument>(
  {
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
    characterId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

roomAssociationSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export const Room = mongoose.model<RoomDocument>('Room', roomSchema);
export const RoomAssociation = mongoose.model<RoomAssociationDocument>('RoomAssociation', roomAssociationSchema);