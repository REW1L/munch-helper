import { SNSClient } from '@aws-sdk/client-sns';
import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { FanoutCharacterEventPublisher, NoopCharacterEventPublisher, SnsCharacterEventPublisher } from './publisher';
import { buildCharacterApp } from './service';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const topicArn = process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN?.trim();
const logTopicArn = process.env.LOG_TOPIC_ARN?.trim();
const notificationsPublisher = topicArn
  ? new SnsCharacterEventPublisher(new SNSClient({}), topicArn)
  : new NoopCharacterEventPublisher();
const logPublisher = logTopicArn
  ? new SnsCharacterEventPublisher(new SNSClient({}), logTopicArn)
  : new NoopCharacterEventPublisher();

if (!logTopicArn) {
  console.warn('[character-service] LOG_TOPIC_ARN is not configured; room-history logging is disabled');
}

const publisher = new FanoutCharacterEventPublisher([
  { target: 'notifications', publisher: notificationsPublisher },
  { target: 'log', publisher: logPublisher }
]);
const app = buildCharacterApp({ routePrefix, publisher });
const mongoUri = process.env.CHARACTER_MONGO_URI || 'mongodb://localhost:27017/munch_character_service';

console.info('[character-service] lambda bootstrap config', {
  routePrefix,
  mongoUri,
  publisher: publisher.constructor.name,
  notificationsPublisher: notificationsPublisher.constructor.name,
  logPublisher: logPublisher.constructor.name,
  topicArnConfigured: Boolean(topicArn),
  logTopicArnConfigured: Boolean(logTopicArn)
});

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  console.info('[character-service] lambda invocation started');
  await connectToMongo(mongoUri);
  console.info('[character-service] lambda mongo connection ready');
  return server(event, context);
};
