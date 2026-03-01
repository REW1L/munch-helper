import { createRoom, CreateRoomResponse, joinRoom, JoinRoomResponse } from '@/api/rooms';
import { useCallback, useState } from 'react';

interface RoomActionState<T> {
  isLoading: boolean;
  errorMessage: string | null;
  result: T | null;
}

type UserRoomContext = {
  userId: string;
  nickname: string;
  avatar: number;
};

export function useRoomCreate() {
  const [state, setState] = useState<RoomActionState<CreateRoomResponse>>({
    isLoading: false,
    errorMessage: null,
    result: null,
  });

  const create = useCallback(async ({ userId, nickname, avatar }: UserRoomContext): Promise<CreateRoomResponse> => {
    setState({ isLoading: true, errorMessage: null, result: null });

    try {
      const response = await createRoom({
        roomTypeId: 'munchkin',
        userId,
        userName: nickname,
        avatarId: avatar,
      });
      setState({ isLoading: false, errorMessage: null, result: response });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
      setState({ isLoading: false, errorMessage, result: null });
      throw error;
    }
  }, []);

  return {
    create,
    ...state,
  };
}

export function useRoomJoin() {
  const [state, setState] = useState<RoomActionState<JoinRoomResponse>>({
    isLoading: false,
    errorMessage: null,
    result: null,
  });

  const join = useCallback(async (roomId: string, { userId, nickname, avatar }: UserRoomContext): Promise<JoinRoomResponse> => {
    setState({ isLoading: true, errorMessage: null, result: null });

    try {
      const response = await joinRoom({
        roomId,
        userId,
        userName: nickname,
        avatarId: avatar,
      });
      setState({ isLoading: false, errorMessage: null, result: response });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      setState({ isLoading: false, errorMessage, result: null });
      throw error;
    }
  }, []);

  return {
    join,
    ...state,
  };
}