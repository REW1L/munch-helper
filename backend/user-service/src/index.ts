import dotenv from 'dotenv';
import { createApp, type UserModelLike } from './app';
import { connectToMongo } from './db';
import { User } from './models/User';

dotenv.config();

const userModel: UserModelLike = {
  create: async (payload) => {
    const user = await User.create(payload);
    return {
      id: user.id,
      name: user.name,
      avatarId: user.avatarId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },
  findById: async (id) => {
    const user = await User.findById(id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: user.name,
      avatarId: user.avatarId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },
  findByIdAndUpdate: async (id, updates, options) => {
    const user = await User.findByIdAndUpdate(id, updates, options);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: user.name,
      avatarId: user.avatarId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
};

const app = createApp(userModel);
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