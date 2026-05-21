import dotenv from 'dotenv';
import { createClient } from 'redis';
import { buildLogApp } from './app';
import { connectToMongo } from './db';
import { parseLogEvent, persistLogEvent } from './service';

dotenv.config();

const app = buildLogApp();
const port = Number(process.env.PORT || 8087);
const mongoUri = process.env.LOG_MONGO_URI || 'mongodb://localhost:27025/munch_log_service';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const eventsChannel = process.env.ROOM_LOG_EVENTS_CHANNEL || 'room-log-events';

const startHttpServer = async (): Promise<void> => {
  await connectToMongo(mongoUri);
  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`log-service listening on :${port}`);
      resolve();
    });
  });
};

const startSubscriber = async (): Promise<void> => {
  const subscriber = createClient({ url: redisUrl });
  subscriber.on('error', (error) => {
    console.error('[log-service] redis client error', {
      channel: eventsChannel,
      redisUrl,
      error
    });
  });

  await subscriber.connect();
  await subscriber.subscribe(eventsChannel, async (message) => {
    try {
      console.info('[log-service] local event received', {
        channel: eventsChannel
      });

      const parsedEvent = parseLogEvent(message);
      if (!parsedEvent) {
        console.warn('log.redis.invalid_event', {
          channel: eventsChannel
        });
        return;
      }

      await connectToMongo(mongoUri);
      await persistLogEvent(parsedEvent);
    } catch (error) {
      console.error('[log-service] failed to process local event', {
        channel: eventsChannel,
        error
      });
    }
  });

  console.info('[log-service] subscribed to Redis channel', {
    channel: eventsChannel,
    redisUrl
  });
};

const start = async (): Promise<void> => {
  await Promise.all([startSubscriber(), startHttpServer()]);
};

start().catch((error: unknown) => {
  console.error('Failed to start log-service', error);
  process.exit(1);
});
