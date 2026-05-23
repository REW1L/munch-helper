import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { buildLogApp } from './app';
import { LogEvent } from './models/LogEvent';

vi.mock('./models/LogEvent', () => ({
  LogEvent: {
    find: vi.fn(),
    findOne: vi.fn()
  }
}));

describe('log-service app', () => {
  it('emits support.failure for unexpected errors without changing the response', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(LogEvent.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          exec: vi.fn().mockRejectedValue(new Error('database unavailable'))
        })
      })
    } as never);

    const response = await request(buildLogApp()).get('/logs').query({ roomId: 'room-1' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: 'Unexpected error' });
    expect(errorSpy).toHaveBeenCalledWith('support.failure', expect.objectContaining({
      subsystem: 'log',
      code: 'unexpected_error',
      correlationId: null,
      httpStatus: 502,
      errorName: 'Error',
      errorMessage: 'database unavailable'
    }));
    errorSpy.mockRestore();
  });
});
