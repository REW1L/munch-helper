import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { FanoutCharacterEventPublisher, NoopCharacterEventPublisher, RedisCharacterEventPublisher } from './publisher';
import { buildCharacterApp } from './service';

dotenv.config();
const redisUrl = process.env.CHARACTER_EVENTS_REDIS_URL?.trim();
const eventsChannel = process.env.ROOM_CHARACTER_EVENTS_CHANNEL || 'room-character-events';
const logEventsChannel = process.env.ROOM_LOG_EVENTS_CHANNEL || 'room-log-events';
const notificationsPublisher = redisUrl
  ? new RedisCharacterEventPublisher(redisUrl, eventsChannel)
  : new NoopCharacterEventPublisher();
const logPublisher = redisUrl
  ? new RedisCharacterEventPublisher(redisUrl, logEventsChannel)
  : new NoopCharacterEventPublisher();

if (!redisUrl) {
  console.warn(
    '[character-service] CHARACTER_EVENTS_REDIS_URL is not configured; both notifications publishing and room-history logging are disabled'
  );
}

const publisher = new FanoutCharacterEventPublisher([
  { target: 'notifications', publisher: notificationsPublisher },
  { target: 'log', publisher: logPublisher }
]);
const app = buildCharacterApp({ publisher });
const port = Number(process.env.CHARACTER_SERVICE_PORT || 8083);
const mongoUri = process.env.CHARACTER_MONGO_URI || 'mongodb://localhost:27017/munch_character_service';

console.info('[character-service] local bootstrap config', {
  port,
  mongoUri,
  publisher: publisher.constructor.name,
  notificationsPublisher: notificationsPublisher.constructor.name,
  logPublisher: logPublisher.constructor.name,
  eventsChannel,
  redisConfigured: Boolean(redisUrl),
  logEventsChannel,
  logConfigured: !(logPublisher instanceof NoopCharacterEventPublisher)
});

connectToMongo(mongoUri)
  .then(() => {
    console.info('[character-service] connected to MongoDB', { mongoUri });
    app.listen(port, () => {
      console.log(`character-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start character-service', error);
    process.exit(1);
  });
