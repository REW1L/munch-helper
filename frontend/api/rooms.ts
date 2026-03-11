import { apiRequest } from '@/api/http';

export interface CreateRoomRequest {
  roomTypeId: 'munchkin';
  userId: string;
  userName?: string;
  avatarId?: number;
}

export interface CreateRoomResponse {
  roomId: string;
  roomTypeId: 'munchkin';
  userId: string;
  characterId: string;
  createdAt: string;
}

export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  userName?: string;
  avatarId?: number;
}

export interface JoinRoomResponse {
  roomId: string;
  userId: string;
  characterId: string;
  joinedAt: string;
  alreadyJoined: boolean;
}

export async function createRoom(payload: CreateRoomRequest, signal?: AbortSignal): Promise<CreateRoomResponse> {
  return apiRequest<CreateRoomResponse>('/rooms', {
    method: 'POST',
    body: payload,
    signal,
  });
}

export async function joinRoom(payload: JoinRoomRequest, signal?: AbortSignal): Promise<JoinRoomResponse> {
  return apiRequest<JoinRoomResponse>('/rooms/associations', {
    method: 'POST',
    body: payload,
    signal,
  });
}
