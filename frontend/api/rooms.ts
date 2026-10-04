import { apiRequest } from '@/api/http';

export interface CreateRoomRequest {
  roomTypeId: RoomTypeId;
  userId: string;
  userName?: string;
  avatarId?: number;
}

export interface CreateRoomResponse {
  roomId: string;
  roomTypeId: RoomTypeId;
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
  roomTypeId: RoomTypeId;
  userId: string;
  characterId: string;
  joinedAt: string;
  alreadyJoined: boolean;
}

export interface RoomMetadata {
  roomId: string;
  roomTypeId: RoomTypeId;
  createdAt: string;
}

export type RoomTypeId = 'munchkin' | 'munchkin-2e';

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

export async function getRoomMetadata(roomId: string, signal?: AbortSignal): Promise<RoomMetadata> {
  return apiRequest<RoomMetadata>(`/rooms/${encodeURIComponent(roomId)}`, { signal });
}
