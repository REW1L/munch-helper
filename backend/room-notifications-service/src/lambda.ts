import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { parseConnectRequest, parseNotificationEvent } from './app';
import { connectToMongo } from './db';
import { listRoomConnections, removeConnection, sendEventToConnections, upsertConnection } from './service';

const mongoUri = process.env.ROOM_NOTIFICATIONS_MONGO_URI || 'mongodb://localhost:27017/munch_room_notifications_service';
const wsEndpoint = process.env.ROOM_NOTIFICATIONS_WS_ENDPOINT;

const wsClient = wsEndpoint
  ? new ApiGatewayManagementApiClient({ endpoint: wsEndpoint })
  : null;

const parseSnsRecords = (event: unknown): string[] => {
  const data = event as { Records?: Array<{ Sns?: { Message?: string } }> };
  if (!Array.isArray(data?.Records)) {
    return [];
  }

  return data.Records.map((record) => record?.Sns?.Message).filter((message): message is string => typeof message === 'string');
};

const handleSnsEvent = async (event: unknown) => {
  if (!wsClient) {
    throw new Error('ROOM_NOTIFICATIONS_WS_ENDPOINT is required to process SNS events');
  }

  const messages = parseSnsRecords(event);
  for (const message of messages) {
    const parsed = parseNotificationEvent(message);
    if (!parsed) {
      continue;
    }

    const connections = await listRoomConnections(parsed.roomId);
    await sendEventToConnections(wsClient, connections, parsed);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed: messages.length })
  };
};

const handleWebSocketEvent = async (event: unknown) => {
  const data = event as {
    requestContext?: {
      routeKey?: string;
      connectionId?: string;
    };
  };

  const routeKey = data.requestContext?.routeKey;
  const connectionId = data.requestContext?.connectionId || '';

  if (routeKey === '$connect') {
    const connectRequest = parseConnectRequest(event);
    if (!connectRequest) {
      return {
        statusCode: 400,
        body: 'Missing required query params roomId and userId'
      };
    }

    await upsertConnection(connectRequest);
    return { statusCode: 200, body: 'Connected.' };
  }

  if (routeKey === '$disconnect') {
    if (connectionId) {
      await removeConnection(connectionId);
    }

    return { statusCode: 200, body: 'Disconnected.' };
  }

  if (routeKey === '$default') {
    return { statusCode: 200, body: 'Ignored.' };
  }

  return { statusCode: 200, body: 'OK' };
};

export const handler = async (event: unknown) => {
  await connectToMongo(mongoUri);

  const snsRecords = parseSnsRecords(event);
  if (snsRecords.length > 0) {
    return handleSnsEvent(event);
  }

  return handleWebSocketEvent(event);
};
