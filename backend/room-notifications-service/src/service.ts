import type { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteConnectionCommand, GetConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { RoomConnection } from './models/RoomConnection';
import { extractErrorFields, logSupportFailure } from './supportSignal';
import type { ConnectionRecord, RoomNotificationEvent } from './types';

export const upsertConnection = async (input: {
  connectionId: string;
  roomId: string;
  userId: string;
}): Promise<void> => {
  await RoomConnection.findOneAndUpdate(
    { connectionId: input.connectionId },
    {
      connectionId: input.connectionId,
      roomId: input.roomId,
      userId: input.userId,
      connectedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  console.info('room-notifications.connection.upserted', {
    connectionId: input.connectionId,
    roomId: input.roomId,
    userId: input.userId
  });
};

export const removeConnection = async (connectionId: string): Promise<void> => {
  await RoomConnection.deleteOne({ connectionId });

  console.info('room-notifications.connection.removed', {
    connectionId
  });
};

export const listRoomConnections = async (roomId: string): Promise<ConnectionRecord[]> => {
  const connections = await RoomConnection.find({ roomId }).sort({ connectedAt: 1 });
  return connections.map((connection) => ({
    connectionId: connection.connectionId,
    roomId: connection.roomId,
    userId: connection.userId,
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt
  }));
};

const isGoneConnectionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return statusCode === 410;
};

const getEventActorId = (event: RoomNotificationEvent): string | undefined => {
  if ('characterId' in event.event_body) {
    return event.event_body.characterId;
  }
  return event.event_body.battleId;
};

export const sendEventToConnections = async (
  client: ApiGatewayManagementApiClient,
  connections: ConnectionRecord[],
  event: RoomNotificationEvent
): Promise<void> => {
  const payload = JSON.stringify({
    event: event.event,
    event_body: event.event_body
  });

  await Promise.all(
    connections.map(async (connection) => {
      try {
        await client.send(new GetConnectionCommand({ ConnectionId: connection.connectionId }));
        await client.send(
          new PostToConnectionCommand({
            ConnectionId: connection.connectionId,
            Data: Buffer.from(payload)
          })
        );

        console.info('room-notifications.event.delivered', {
          event: event.event,
          roomId: event.roomId,
          event_body: event.event_body,
          connectionId: connection.connectionId,
          userId: connection.userId
        });
      } catch (error) {
        if (isGoneConnectionError(error)) {
          console.warn('room-notifications.connection.stale', {
            connectionId: connection.connectionId,
            roomId: connection.roomId,
            userId: connection.userId
          });
          await removeConnection(connection.connectionId);
          return;
        }

        logSupportFailure({
          subsystem: 'session_continuity',
          code: 'ws_event_delivery_failed',
          message: `Failed to deliver ${event.event}`,
          correlationId: event.correlationId ?? null,
          roomId: event.roomId,
          actorId: getEventActorId(event),
          sessionId: connection.connectionId,
          ...extractErrorFields(error)
        });
        console.error('room-notifications.event.delivery_failed', {
          event: event.event,
          roomId: event.roomId,
          event_body: event.event_body,
          connectionId: connection.connectionId,
          userId: connection.userId,
          error
        });
        throw error;
      }
    })
  );
};

export const disconnectConnection = async (
  client: ApiGatewayManagementApiClient,
  connectionId: string
): Promise<void> => {
  try {
    await client.send(new DeleteConnectionCommand({ ConnectionId: connectionId }));
  } catch {
    // Ignore failures here because stale connections are cleaned up by the fanout path.
  }
};
