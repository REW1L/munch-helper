import { createApp, type CharacterModelLike } from './app';
import { Character } from './models/Character';

export function createCharacterModel(): CharacterModelLike {
  return {
    find: (query) => ({
      sort: async (sortBy) => {
        const characters = await Character.find(query).sort(sortBy);
        return characters.map((character) => ({
          id: character.id,
          roomId: character.roomId,
          userId: character.userId,
          name: character.name,
          avatarId: character.avatarId,
          level: character.level,
          power: character.power,
          class: character.class,
          race: character.race,
          gender: character.gender,
          createdAt: character.createdAt,
          updatedAt: character.updatedAt
        }));
      }
    }),
    create: async (payload) => {
      const character = await Character.create(payload);
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        level: character.level,
        power: character.power,
        class: character.class,
        race: character.race,
        gender: character.gender,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      };
    },
    findByIdAndUpdate: async (id, updates, options) => {
      const character = await Character.findByIdAndUpdate(id, updates, options);
      if (!character) {
        return null;
      }
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        level: character.level,
        power: character.power,
        class: character.class,
        race: character.race,
        gender: character.gender,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      };
    },
    findByIdAndDelete: async (id) => {
      const character = await Character.findByIdAndDelete(id);
      if (!character) {
        return null;
      }
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        level: character.level,
        power: character.power,
        class: character.class,
        race: character.race,
        gender: character.gender,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
      };
    }
  };
}

export function buildCharacterApp() {
  return createApp(createCharacterModel());
}