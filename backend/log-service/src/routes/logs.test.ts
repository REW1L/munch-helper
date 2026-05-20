import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildLogApp } from '../app';

describe('log-service logs routes', () => {
  it('returns an empty history skeleton for a present roomId', async () => {
    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 400 when roomId is missing or blank', async () => {
    const missingResponse = await request(buildLogApp()).get('/logs');
    const blankResponse = await request(buildLogApp()).get('/logs').query({ roomId: ' ' });

    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ message: 'roomId is required' });
    expect(blankResponse.status).toBe(400);
    expect(blankResponse.body).toEqual({ message: 'roomId is required' });
  });

  it('mounts under a route prefix', async () => {
    const response = await request(buildLogApp({ routePrefix: '/prod' })).get('/prod/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
