import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { buildUserApp } from './service';

dotenv.config();

const app = buildUserApp();
const port = Number(process.env.USER_SERVICE_PORT || 8081);
const mongoUri = process.env.USER_MONGO_URI || 'mongodb://localhost:27017/munch_user_service';

connectToMongo(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`user-service listening on :${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start user-service', error);
    process.exit(1);
  });