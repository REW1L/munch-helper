import serverlessExpress from '@codegenie/serverless-express';
import { connectToMongo } from './db';
import { buildBattleApp } from './service';

const routePrefix = process.env.ROUTE_PREFIX || '/';
const app = buildBattleApp({ routePrefix });
const mongoUri = process.env.BATTLE_MONGO_URI || 'mongodb://localhost:27024/munch_battle_service';

console.info('[battle-service] lambda bootstrap config', {
  routePrefix,
  mongoUri
});

const server = serverlessExpress({ app });

export const handler = async (event: unknown, context: unknown) => {
  console.info('[battle-service] lambda invocation started');
  await connectToMongo(mongoUri);
  console.info('[battle-service] lambda mongo connection ready');
  return server(event, context);
};
