import { generate } from 'random-words';
import { mongoose } from '../db';

interface RoomDocument {
  _id: string;
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

function generateRoomId() {
  const word = generate({
    exactly: 1,
    join: '',
    minLength: 2,
    maxLength: 6,
    formatter: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  }).toUpperCase();
  const number = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  return `${word}${number}`;
}

const roomSchema = new mongoose.Schema<RoomDocument>(
  {
    _id: {
      type: String,
      default: generateRoomId
    },
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