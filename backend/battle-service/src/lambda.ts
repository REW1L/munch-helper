import { SNSClient } from '@aws-sdk/client-sns';
import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { NoopBattleEventPublisher, SnsBattleEventPublisher } from './publisher';
import { buildBattleApp } from './service';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const topicArn = process.env.ROOM_CHARACTER_EVENTS_TOPIC_ARN;
const publisher = topicArn
  ? new SnsBattleEventPublisher(new SNSClient({}), topicArn)
  : new NoopBattleEventPublisher();
const app = buildBattleApp({ routePrefix, publisher });
const mongoUri = process.env.BATTLE_MONGO_URI || 'mongodb://localhost:27024/munch_battle_service';

console.info('[battle-service] lambda bootstrap config', {
  routePrefix,
  mongoUri,
  publisher: publisher.constructor.name,
  topicArnConfigured: Boolean(topicArn)
});

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  console.info('[battle-service] lambda invocation started');
  await connectToMongo(mongoUri);
  console.info('[battle-service] lambda mongo connection ready');
  return server(event, context);
};
