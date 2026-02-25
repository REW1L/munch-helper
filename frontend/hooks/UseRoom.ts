import { useRouter } from "expo-router";



// Generate a random URL-safe string
const generateRandomUrlSafeString = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

async function createGameRoom(userId: string) {
  // Not implemented yet
  console.log('CREATE GAME ROOM NOT IMPLEMENTED YET FOR USER ID:', userId);
  return Promise.resolve(generateRandomUrlSafeString(8));
}


export function useRoomCreate(userId: string) {
  const router = useRouter();
  const createGameRoomPromise = async () => {
    const roomId = await createGameRoom(userId);
    router.dismissTo(`/munchkin/${roomId}`);
  }
  createGameRoomPromise().catch(console.error);
}