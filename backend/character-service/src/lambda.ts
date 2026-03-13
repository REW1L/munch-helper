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

console.info('[character-service] lambda bootstrap config', {
  routePrefix,
  mongoUri,
  publisher: publisher.constructor.name,
  topicArnConfigured: Boolean(topicArn)
});

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  console.info('[character-service] lambda invocation started');
  await connectToMongo(mongoUri);
  console.info('[character-service] lambda mongo connection ready');
  return server(event, context);
};