import type { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteConnectionCommand, GetConnectionCommand, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { RoomConnection } from './models/RoomConnection';
import type { ConnectionRecord, RoomCharacterNotificationEvent } from './types';

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
};

export const removeConnection = async (connectionId: string): Promise<void> => {
  await RoomConnection.deleteOne({ connectionId });
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

export const sendEventToConnections = async (
  client: ApiGatewayManagementApiClient,
  connections: ConnectionRecord[],
  event: RoomCharacterNotificationEvent
): Promise<void> => {
  const payload = JSON.stringify({
    event: event.event,
    event_body: {
      characterId: event.event_body.characterId
    }
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
      } catch (error) {
        if (isGoneConnectionError(error)) {
          await removeConnection(connection.connectionId);
          return;
        }

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
