import { mongoose } from '../db';

export type LogEventType =
  | 'character_created'
  | 'character_updated'
  | 'character_deleted'
  | 'battle_started'
  | 'battle_concluded'
  | 'battle_discarded';

export interface LogEventDocument {
  roomId: string;
  eventType: LogEventType;
  actorId: string;
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const logEventSchema = new mongoose.Schema<LogEventDocument>(
  {
    roomId: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'character_created',
        'character_updated',
        'character_deleted',
        'battle_started',
        'battle_concluded',
        'battle_discarded'
      ]
    },
    actorId: { type: String, required: true },
    summary: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    occurredAt: { type: Date, required: true }
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

logEventSchema.index({ roomId: 1, _id: -1 });

export const LogEvent = mongoose.model<LogEventDocument>('LogEvent', logEventSchema);
