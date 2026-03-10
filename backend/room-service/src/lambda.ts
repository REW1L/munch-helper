import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { buildRoomApp } from './service';

const mongoUri = process.env.ROOM_MONGO_URI || 'mongodb://localhost:27017/munch_room_service';
const characterServiceUrl = process.env.CHARACTER_SERVICE_URL || 'http://localhost:8083';
const characterCallTimeoutMs = Number(process.env.CHARACTER_CALL_TIMEOUT_MS || 2000);
const routePrefix = process.env.ROUTE_PREFIX || '/';

const app = buildRoomApp({
  characterServiceUrl,
  characterCallTimeoutMs,
  routePrefix
});
const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  await connectToMongo(mongoUri);
  return server(event, context);
};