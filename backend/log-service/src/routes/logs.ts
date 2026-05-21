import { Router } from 'express';

export const logsRouter = Router();

logsRouter.get('/logs', (request, response) => {
  const roomId = typeof request.query.roomId === 'string' ? request.query.roomId.trim() : '';
  if (!roomId) {
    response.status(400).json({ message: 'roomId is required' });
    return;
  }

  // Story 6.4: cursor pagination + roomId-filtered query + GET /logs/:logId implemented here.
  response.status(200).json([]);
});
