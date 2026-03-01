import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { buildRoomApp } from './service';

dotenv.config();

const port = Number(process.env.ROOM_SERVICE_PORT || 8082);
const mongoUri = process.env.ROOM_MONGO_URI || 'mongodb://localhost:27017/munch_room_service';
const characterServiceUrl = process.env.CHARACTER_SERVICE_URL || 'http://localhost:8083';
const characterCallTimeoutMs = Number(process.env.CHARACTER_CALL_TIMEOUT_MS || 2000);
const app = buildRoomApp({ characterServiceUrl, characterCallTimeoutMs });

connectToMongo(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`room-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start room-service', error);
    process.exit(1);
  });