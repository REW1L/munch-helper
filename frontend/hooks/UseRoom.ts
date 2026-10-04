import { createRoom, CreateRoomResponse, joinRoom, JoinRoomResponse, RoomTypeId } from '@/api/rooms';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

type UserRoomContext = {
  userId: string;
  nickname: string;
  avatar: number;
};

export function useRoomCreate() {
  const mutation = useMutation<CreateRoomResponse, Error, UserRoomContext & { roomTypeId?: RoomTypeId }>({
    mutationFn: async ({ userId, nickname, avatar, roomTypeId = 'munchkin' }): Promise<CreateRoomResponse> => {
      return createRoom({
        roomTypeId,
        userId,
        userName: nickname,
        avatarId: avatar,
      });
    },
  });

  const create = mutation.mutateAsync;

  return useMemo(
    () => ({
      create,
      isLoading: mutation.isPending,
      errorMessage: mutation.error?.message ?? null,
      result: mutation.data ?? null,
    }),
    [create, mutation.data, mutation.error?.message, mutation.isPending]
  );
}

export function useRoomJoin() {
  const mutation = useMutation<JoinRoomResponse, Error, { roomId: string; context: UserRoomContext }>({
    mutationFn: async ({ roomId, context }): Promise<JoinRoomResponse> => {
      return joinRoom({
        roomId,
        userId: context.userId,
        userName: context.nickname,
        avatarId: context.avatar,
      });
    },
  });

  const join = useCallback(async (roomId: string, context: UserRoomContext): Promise<JoinRoomResponse> => {
    return mutation.mutateAsync({ roomId, context });
  }, [mutation.mutateAsync]);

  return useMemo(
    () => ({
      join,
      isLoading: mutation.isPending,
      errorMessage: mutation.error?.message ?? null,
      result: mutation.data ?? null,
    }),
    [join, mutation.data, mutation.error?.message, mutation.isPending]
  );
}
