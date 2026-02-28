import mongoose from 'mongoose';

export async function connectToMongo(mongoUri: string): Promise<void> {
  await mongoose.connect(mongoUri);
}

export { mongoose };
