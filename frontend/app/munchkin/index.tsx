import { userProfileContext } from '@/context/UserContext';
import { useRoomCreate } from '@/hooks/UseRoom';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface Character {
  id: string;
  nickname: string;
  avatar?: number;
  level: number;
  power: number;
  color: string;
  race: string[];
  gender: string[];
  class: string[];
}

// Generate a random URL-safe string
const generateRandomUrlSafeString = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

async function createGameRoom() {
  // Not implemented yet
  console.log('CREATE GAME ROOM NOT IMPLEMENTED YET');
  return Promise.resolve(generateRandomUrlSafeString(8));
}

const MunchkinIndexView: React.FC = () => {
  const { userProfile } = React.useContext(userProfileContext);
  useRoomCreate(userProfile.id);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4C4545' }}>
      <ActivityIndicator size="large" color="#6E6BD4" />
      <Text style={{ marginTop: 10, color: '#FFFFFF', fontSize: 16 }}>Loading game room...</Text>
    </View>
  );
};

export default MunchkinIndexView;
