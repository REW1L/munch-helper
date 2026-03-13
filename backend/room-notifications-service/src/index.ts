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
    console.warn('room-notifications.local.connect_rejected', {
      requestUrl: request.url
    });
    socket.close(1008, 'Expected /ws?roomId=<id>&userId=<id>');
    return;
  }

  connections.set(socket, connection);
  console.info('room-notifications.local.connected', {
    roomId: connection.roomId,
    userId: connection.userId,
    activeConnections: connections.size
  });

  socket.on('close', () => {
    const existingConnection = connections.get(socket);
    connections.delete(socket);

    console.info('room-notifications.local.disconnected', {
      roomId: existingConnection?.roomId,
      userId: existingConnection?.userId,
      activeConnections: connections.size
    });
  });
});

const start = async () => {
  await subscriber.connect();

  await subscriber.subscribe(eventsChannel, async (message) => {
    console.info('room-notifications.local.event_received', {
      channel: eventsChannel,
      message
    });

    const parsedEvent = parseNotificationEvent(message);
    if (!parsedEvent) {
      console.warn('room-notifications.local.invalid_event', {
        channel: eventsChannel
      });
      return;
    }

    const payload = JSON.stringify({
      event: parsedEvent.event,
      event_body: parsedEvent.event_body
    });

    let deliveredCount = 0;

    for (const [socket, connection] of connections.entries()) {
      if (connection.roomId !== parsedEvent.roomId || socket.readyState !== socket.OPEN) {
        continue;
      }

      socket.send(payload);
      deliveredCount += 1;
    }

    console.info('room-notifications.local.event_dispatched', {
      event: parsedEvent.event,
      roomId: parsedEvent.roomId,
      characterId: parsedEvent.event_body.characterId,
      deliveredCount,
      activeConnections: connections.size
    });
  });

  console.log(`room-notifications-service listening on :${port}`);
};

start().catch((error) => {
  console.error('Failed to start room-notifications-service', error);
  process.exit(1);
});
