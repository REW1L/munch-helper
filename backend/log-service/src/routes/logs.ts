import { NextFunction, Request, Response, Router } from 'express';
import { mongoose } from '../db';
import { getLogEvent, listLogEvents } from '../service';

export const logsRouter = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const readTrimmedQuery = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const parseLimit = (value: unknown): { limit: number } | { message: string } => {
  if (value === undefined || value === null || value === '') {
    return { limit: DEFAULT_LIMIT };
  }

  if (typeof value !== 'string') {
    return { message: 'limit must be a positive integer' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { limit: DEFAULT_LIMIT };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { message: 'limit must be a positive integer' };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed <= 0) {
    return { message: 'limit must be a positive integer' };
  }

  return { limit: Math.min(parsed, MAX_LIMIT) };
};

logsRouter.get('/logs', async (request: Request, response: Response, next: NextFunction) => {
  const roomId = typeof request.query.roomId === 'string' ? request.query.roomId.trim() : '';
  if (!roomId) {
    response.status(400).json({ message: 'roomId is required' });
    return;
  }

  const limitResult = parseLimit(request.query.limit);
  if ('message' in limitResult) {
    response.status(400).json({ message: limitResult.message });
    return;
  }

  const before = readTrimmedQuery(request.query.before);
  if (request.query.before !== undefined && !before) {
    response.status(400).json({ message: 'before must be a valid ObjectId' });
    return;
  }
  if (before && !mongoose.Types.ObjectId.isValid(before)) {
    response.status(400).json({ message: 'before must be a valid ObjectId' });
    return;
  }

  try {
    const entries = await listLogEvents({
      roomId,
      limit: limitResult.limit,
      before: before || undefined
    });
    response.status(200).json(entries);
  } catch (error) {
    next(error);
  }
});

logsRouter.get('/logs/:logId', async (request: Request, response: Response, next: NextFunction) => {
  const roomId = readTrimmedQuery(request.query.roomId);
  if (!roomId) {
    response.status(400).json({ message: 'roomId is required' });
    return;
  }

  const logId = readTrimmedQuery(request.params.logId);
  if (!mongoose.Types.ObjectId.isValid(logId)) {
    response.status(400).json({ message: 'logId must be a valid ObjectId' });
    return;
  }

  try {
    const entry = await getLogEvent({ roomId, logId });
    if (!entry) {
      response.status(404).json({ message: 'Log event not found' });
      return;
    }

    response.status(200).json(entry);
  } catch (error) {
    next(error);
  }
});
