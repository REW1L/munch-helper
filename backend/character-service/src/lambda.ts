import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { buildCharacterApp } from './service';

const app = buildCharacterApp();
const mongoUri = process.env.CHARACTER_MONGO_URI || 'mongodb://localhost:27017/munch_character_service';

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  await connectToMongo(mongoUri);
  return server(event, context);
};