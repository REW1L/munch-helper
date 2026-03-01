import dotenv from 'dotenv';
import { createApp, type CharacterModelLike } from './app';
import { connectToMongo } from './db';
import { Character } from './models/Character';

dotenv.config();

const characterModel: CharacterModelLike = {
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

const app = createApp(characterModel);
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