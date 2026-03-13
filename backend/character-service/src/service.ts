import { createApp, type CharacterModelLike } from './app';
import { Character } from './models/Character';
import { type CharacterEventPublisher } from './publisher';

interface BuildCharacterAppOptions {
  routePrefix?: string;
  publisher?: CharacterEventPublisher;
}

export function createCharacterModel(): CharacterModelLike {
  return {
    find: (query) => ({
      sort: async (sortBy) => {
        console.info('[character-service] db find characters', { query, sortBy });
        const characters = await Character.find(query).sort(sortBy);
        console.info('[character-service] db find characters success', { count: characters.length });
        return characters.map((character) => ({
          id: character.id,
          roomId: character.roomId,
          userId: character.userId,
          name: character.name,
          avatarId: character.avatarId,
          color: character.color,
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
      console.info('[character-service] db create character', {
        roomId: payload.roomId,
        userId: payload.userId,
        name: payload.name,
        avatarId: payload.avatarId
      });
      const character = await Character.create(payload);
      console.info('[character-service] db create character success', {
        characterId: character.id,
        roomId: character.roomId
      });
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        color: character.color,
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
      console.info('[character-service] db update character', {
        characterId: id,
        updates: Object.keys(updates)
      });
      const character = await Character.findByIdAndUpdate(id, updates, options);
      if (!character) {
        console.info('[character-service] db update character not found', { characterId: id });
        return null;
      }
      console.info('[character-service] db update character success', {
        characterId: character.id,
        roomId: character.roomId
      });
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        color: character.color,
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
      console.info('[character-service] db delete character', { characterId: id });
      const character = await Character.findByIdAndDelete(id);
      if (!character) {
        console.info('[character-service] db delete character not found', { characterId: id });
        return null;
      }
      console.info('[character-service] db delete character success', {
        characterId: character.id,
        roomId: character.roomId
      });
      return {
        id: character.id,
        roomId: character.roomId,
        userId: character.userId,
        name: character.name,
        avatarId: character.avatarId,
        color: character.color,
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

export function buildCharacterApp(options: BuildCharacterAppOptions = {}) {
  console.info('[character-service] building app', {
    routePrefix: options.routePrefix,
    publisher: options.publisher?.constructor.name || 'NoopCharacterEventPublisher'
  });

  return createApp(createCharacterModel(), {
    routePrefix: options.routePrefix,
    publisher: options.publisher
  });
}