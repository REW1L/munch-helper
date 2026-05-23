import { connectToMongo } from './db';
import { parseLogEvent, persistLogEvent } from './service';
import { extractErrorFields, logSupportFailure } from './supportSignal';

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
      logSupportFailure({
        subsystem: 'log',
        code: 'log_invalid_event',
        message: 'SNS message failed parseLogEvent',
        correlationId: null
      });
      continue;
    }

    try {
      await persistLogEvent(parsed);
      processed += 1;
    } catch (error) {
      logSupportFailure({
        subsystem: 'log',
        code: 'log_persist_failed',
        message: 'Failed to persist log event',
        correlationId: parsed.correlationId ?? null,
        roomId: parsed.roomId,
        actorId: parsed.actorId,
        ...extractErrorFields(error)
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed })
  };
};
