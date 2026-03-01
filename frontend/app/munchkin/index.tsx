import { userProfileContext } from '@/context/UserContext';
import { useRoomCreate, useRoomJoin } from '@/hooks/UseRoom';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const MunchkinIndexView: React.FC = () => {
  const router = useRouter();
  const { userProfile } = React.useContext(userProfileContext);
  const roomIdParam = useLocalSearchParams().roomId;
  const roomId = useMemo(() => {
    if (Array.isArray(roomIdParam)) {
      return roomIdParam[0];
    }

    return roomIdParam;
  }, [roomIdParam]);

  const { create, isLoading: isCreating, errorMessage: createErrorMessage } = useRoomCreate();
  const { join, isLoading: isJoining, errorMessage: joinErrorMessage } = useRoomJoin();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userProfile.id) {
        return;
      }

      try {
        if (roomId) {
          const joinedRoom = await join(roomId, {
            userId: userProfile.id,
            nickname: userProfile.nickname,
            avatar: userProfile.avatar,
          });

          if (!cancelled) {
            router.dismissTo(`/munchkin/${joinedRoom.roomId}`);
          }
          return;
        }

        const createdRoom = await create({
          userId: userProfile.id,
          nickname: userProfile.nickname,
          avatar: userProfile.avatar,
        });

        if (!cancelled) {
          router.dismissTo(`/munchkin/${createdRoom.roomId}`);
        }
      } catch (error) {
        console.error('Failed to bootstrap room session:', error);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [create, join, roomId, router, userProfile.avatar, userProfile.id, userProfile.nickname]);

  const errorMessage = roomId ? joinErrorMessage : createErrorMessage;
  const isLoading = roomId ? isJoining : isCreating;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4C4545' }}>
      <ActivityIndicator size="large" color="#6E6BD4" />
      <Text style={{ marginTop: 10, color: '#FFFFFF', fontSize: 16 }}>
        {isLoading ? 'Loading game room...' : errorMessage || 'Unable to connect to room service'}
      </Text>
    </View>
  );
};

export default MunchkinIndexView;
