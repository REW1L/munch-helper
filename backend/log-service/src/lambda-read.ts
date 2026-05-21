import serverlessExpress from '@codegenie/serverless-express';
import { buildLogApp } from './app';
import { connectToMongo } from './db';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const app = buildLogApp({ routePrefix });
const mongoUri = process.env.LOG_MONGO_URI || 'mongodb://localhost:27025/munch_log_service';

console.info('[log-service] lambda reader bootstrap config', {
  routePrefix,
  mongoUri
});

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  console.info('[log-service] lambda reader invocation started');
  await connectToMongo(mongoUri);
  console.info('[log-service] lambda reader mongo connection ready');
  return server(event, context);
};
