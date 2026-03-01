import { apiRequest } from '@/api/http';

export interface ApiUser {
  id: string;
  name: string;
  avatarId: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  name: string;
  avatarId: number;
}

interface UpdateUserRequest {
  name?: string;
  avatarId?: number;
}

export async function createUser(payload: CreateUserRequest): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users', {
    method: 'POST',
    body: payload,
  });
}

export async function getUser(userId: string): Promise<ApiUser> {
  return apiRequest<ApiUser>(`/users/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
}

export async function updateUser(userId: string, payload: UpdateUserRequest): Promise<ApiUser> {
  return apiRequest<ApiUser>(`/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: payload,
  });
}
