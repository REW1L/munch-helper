import { mongoose } from '../db';

export type BattleStatus = 'active' | 'concluded' | 'discarded';
export type BattleResult = 'players_win' | 'monster_wins' | null;

export interface BonusItemDocument {
  id: string;
  value: number;
}

export interface MonsterItemDocument {
  id: string;
  name: string;
  level: number;
}

export interface BattleDocument {
  roomId: string;
  name: string;
  status: BattleStatus;
  playerSide: {
    characterIds: string[];
    bonuses: BonusItemDocument[];
  };
  monsterSide: {
    monsters: MonsterItemDocument[];
    bonuses: BonusItemDocument[];
  };
  result: BattleResult;
  concludedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bonusItemSchema = new mongoose.Schema<BonusItemDocument>(
  {
    id: { type: String, required: true },
    value: { type: Number, required: true }
  },
  { _id: false }
);

const monsterItemSchema = new mongoose.Schema<MonsterItemDocument>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    level: { type: Number, required: true }
  },
  { _id: false }
);

const battleSchema = new mongoose.Schema<BattleDocument>(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'concluded', 'discarded'],
      default: 'active',
      required: true
    },
    playerSide: {
      characterIds: { type: [String], default: [] },
      bonuses: { type: [bonusItemSchema], default: [] }
    },
    monsterSide: {
      monsters: { type: [monsterItemSchema], default: [] },
      bonuses: { type: [bonusItemSchema], default: [] }
    },
    result: {
      type: String,
      enum: ['players_win', 'monster_wins', null],
      default: null
    },
    concludedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

battleSchema.index(
  { roomId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
battleSchema.index({ roomId: 1, createdAt: -1 });

export const Battle = mongoose.model<BattleDocument>('Battle', battleSchema);
