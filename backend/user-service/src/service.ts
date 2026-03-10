import { createApp, type UserModelLike } from './app';
import { User } from './models/User';

interface BuildUserAppOptions {
  routePrefix?: string;
}

export function createUserModel(): UserModelLike {
  return {
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
}

export function buildUserApp(options: BuildUserAppOptions = {}) {
  return createApp(createUserModel(), { routePrefix: options.routePrefix });
}