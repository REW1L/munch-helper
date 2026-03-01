import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { buildCharacterApp } from './service';

dotenv.config();
const app = buildCharacterApp();
const port = Number(process.env.CHARACTER_SERVICE_PORT || 8083);
const mongoUri = process.env.CHARACTER_MONGO_URI || 'mongodb://localhost:27017/munch_character_service';

connectToMongo(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`character-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start character-service', error);
    process.exit(1);
  });