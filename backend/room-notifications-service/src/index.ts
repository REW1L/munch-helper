import dotenv from 'dotenv';
import { createClient } from 'redis';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { parseLocalConnectionRequest, parseNotificationEvent } from './app';

dotenv.config();

const port = Number(process.env.ROOM_NOTIFICATIONS_PORT || 8084);
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const eventsChannel = process.env.ROOM_CHARACTER_EVENTS_CHANNEL || 'room-character-events';

const wss = new WebSocketServer({ port });
const subscriber = createClient({ url: redisUrl });
const connections = new Map<WebSocket, { roomId: string; userId: string }>();

wss.on('connection', (socket, request) => {
  const connection = parseLocalConnectionRequest(request.url);

  if (!connection) {
    socket.close(1008, 'Expected /rooms/:roomId?userId=<id>');
    return;
  }

  connections.set(socket, connection);

  socket.on('close', () => {
    connections.delete(socket);
  });
});

const start = async () => {
  await subscriber.connect();

  await subscriber.subscribe(eventsChannel, async (message) => {
    const parsedEvent = parseNotificationEvent(message);
    if (!parsedEvent) {
      return;
    }

    const payload = JSON.stringify({
      event: parsedEvent.event,
      event_body: parsedEvent.event_body
    });

    for (const [socket, connection] of connections.entries()) {
      if (connection.roomId !== parsedEvent.roomId || socket.readyState !== socket.OPEN) {
        continue;
      }

      socket.send(payload);
    }
  });

  console.log(`room-notifications-service listening on :${port}`);
};

start().catch((error) => {
  console.error('Failed to start room-notifications-service', error);
  process.exit(1);
});
