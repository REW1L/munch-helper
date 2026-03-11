import { SNSClient } from '@aws-sdk/client-sns';
import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { NoopCharacterEventPublisher, SnsCharacterEventPublisher } from './publisher';
import { buildCharacterApp } from './service';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const topicArn = process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN;
const publisher = topicArn
  ? new SnsCharacterEventPublisher(new SNSClient({}), topicArn)
  : new NoopCharacterEventPublisher();
const app = buildCharacterApp({ routePrefix, publisher });
const mongoUri = process.env.CHARACTER_MONGO_URI || 'mongodb://localhost:27017/munch_character_service';

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  await connectToMongo(mongoUri);
  return server(event, context);
};