import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { FanOutBattleEventPublisher, NoopBattleEventPublisher, RedisBattleEventPublisher } from './publisher';
import { buildBattleApp } from './service';

dotenv.config();
const redisUrl = process.env.BATTLE_EVENTS_REDIS_URL;
const eventsChannel = process.env.ROOM_CHARACTER_EVENTS_CHANNEL || 'room-character-events';
const logEventsChannel = process.env.ROOM_LOG_EVENTS_CHANNEL || 'room-log-events';
const notificationsPublisher = redisUrl
  ? new RedisBattleEventPublisher(redisUrl, eventsChannel)
  : new NoopBattleEventPublisher();
const logPublisher = redisUrl && logEventsChannel
  ? new RedisBattleEventPublisher(redisUrl, logEventsChannel)
  : new NoopBattleEventPublisher();
if (!redisUrl || !logEventsChannel) {
  console.warn('[battle-service] log Redis publisher not configured; degraded - battle log history will be absent');
}
const publisher = new FanOutBattleEventPublisher([
  { target: 'notifications', publisher: notificationsPublisher },
  { target: 'log', publisher: logPublisher }
]);
const app = buildBattleApp({ publisher });
const port = Number(process.env.PORT || 8086);
const mongoUri = process.env.BATTLE_MONGO_URI || 'mongodb://localhost:27024/munch_battle_service';

console.info('[battle-service] local bootstrap config', {
  port,
  mongoUri,
  publisher: publisher.constructor.name,
  eventsChannel,
  logEventsChannel,
  redisConfigured: Boolean(redisUrl),
  logConfigured: Boolean(redisUrl && logEventsChannel)
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
