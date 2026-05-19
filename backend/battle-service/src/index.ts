import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { NoopBattleEventPublisher, RedisBattleEventPublisher } from './publisher';
import { buildBattleApp } from './service';

dotenv.config();
const redisUrl = process.env.BATTLE_EVENTS_REDIS_URL;
const eventsChannel = process.env.ROOM_CHARACTER_EVENTS_CHANNEL || 'room-character-events';
const publisher = redisUrl
  ? new RedisBattleEventPublisher(redisUrl, eventsChannel)
  : new NoopBattleEventPublisher();
const app = buildBattleApp({ publisher });
const port = Number(process.env.PORT || 8086);
const mongoUri = process.env.BATTLE_MONGO_URI || 'mongodb://localhost:27024/munch_battle_service';

console.info('[battle-service] local bootstrap config', {
  port,
  mongoUri,
  publisher: publisher.constructor.name,
  eventsChannel,
  redisConfigured: Boolean(redisUrl)
});

connectToMongo(mongoUri)
  .then(() => {
    console.info('[battle-service] connected to MongoDB', { mongoUri });
    app.listen(port, () => {
      console.log(`battle-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start battle-service', error);
    process.exit(1);
  });
