import dotenv from 'dotenv';
import { connectToMongo } from './db';
import { buildBattleApp } from './service';

dotenv.config();
const app = buildBattleApp();
const port = Number(process.env.PORT || 8086);
const mongoUri = process.env.BATTLE_MONGO_URI || 'mongodb://localhost:27024/munch_battle_service';

console.info('[battle-service] local bootstrap config', {
  port,
  mongoUri
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
