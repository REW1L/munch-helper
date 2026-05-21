import { connectToMongo } from './db';
import { parseLogEvent, persistLogEvent } from './service';

const mongoUri = process.env.LOG_MONGO_URI || 'mongodb://localhost:27017/munch_log_service';
const topicArn = process.env.LOG_TOPIC_ARN;

if (!topicArn || !topicArn.trim()) {
  throw new Error('LOG_TOPIC_ARN is required for log-service logWriter');
}

const parseSnsRecords = (event: unknown): string[] => {
  const data = event as { Records?: Array<{ Sns?: { Message?: string } }> };
  if (!Array.isArray(data?.Records)) {
    return [];
  }

  return data.Records.map((record) => record?.Sns?.Message).filter((message): message is string => typeof message === 'string');
};

export const handler = async (event: unknown) => {
  const messages = parseSnsRecords(event);
  console.info('log.sns.received', {
    messageCount: messages.length,
    topicArn
  });

  await connectToMongo(mongoUri);

  let processed = 0;
  for (const message of messages) {
    const parsed = parseLogEvent(message);
    if (!parsed) {
      console.warn('log.sns.invalid_event', {
        message
      });
      continue;
    }

    try {
      await persistLogEvent(parsed);
      processed += 1;
    } catch (error) {
      console.warn('log.sns.persist_failed', {
        eventType: parsed.eventType,
        roomId: parsed.roomId,
        actorId: parsed.actorId,
        error
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed })
  };
};
