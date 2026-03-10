import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { buildUserApp } from './service';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const app = buildUserApp({ routePrefix });
const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/munch_user_service';

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  await connectToMongo(mongoUri);
  return server(event, context);
};