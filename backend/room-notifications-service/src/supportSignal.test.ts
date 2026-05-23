import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractErrorFields, logSupportFailure, type SupportFailureInput } from './supportSignal';

describe('supportSignal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the full support failure shape', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logSupportFailure({
      subsystem: 'session_continuity',
      code: 'ws_event_delivery_failed',
      message: 'Failed to deliver character_created',
      correlationId: 'corr-1',
      roomId: 'room-1',
      actorId: 'character-1',
      sessionId: 'connection-1',
      httpStatus: 502,
      errorName: 'Error',
      errorMessage: 'websocket unavailable'
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('support.failure', {
      subsystem: 'session_continuity',
      code: 'ws_event_delivery_failed',
      message: 'Failed to deliver character_created',
      correlationId: 'corr-1',
      roomId: 'room-1',
      actorId: 'character-1',
      sessionId: 'connection-1',
      httpStatus: 502,
      errorName: 'Error',
      errorMessage: 'websocket unavailable'
    });
  });

  it('logs minimum fields and preserves null correlationId', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logSupportFailure({
      subsystem: 'session_continuity',
      code: 'unexpected_error',
      message: 'Unhandled error',
      correlationId: null
    });

    expect(errorSpy).toHaveBeenCalledWith('support.failure', {
      subsystem: 'session_continuity',
      code: 'unexpected_error',
      message: 'Unhandled error',
      correlationId: null
    });
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('roomId');
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('errorName');
  });

  it('drops unexpected fields before logging', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logSupportFailure({
      subsystem: 'session_continuity',
      code: 'unexpected_error',
      message: 'Unhandled error',
      correlationId: 'corr-1',
      name: 'Hidden Name',
      email: 'hidden@example.com',
      password: 'secret',
      token: 'abc'
    } as SupportFailureInput & { name: string; email: string; password: string; token: string });

    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('name');
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('email');
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('password');
    expect(errorSpy.mock.calls[0][1]).not.toHaveProperty('token');
  });

  it('extracts safe error fields', () => {
    expect(extractErrorFields(new TypeError('bad type'))).toEqual({ errorName: 'TypeError', errorMessage: 'bad type' });
    expect(extractErrorFields('plain failure')).toEqual({ errorMessage: 'plain failure' });
    expect(extractErrorFields({})).toEqual({});
  });

  it('restricts subsystems at the type level', () => {
    const valid: SupportFailureInput = {
      subsystem: 'room',
      code: 'unexpected_error',
      message: 'Unhandled error',
      correlationId: null
    };

    expect(valid.subsystem).toBe('room');
    const invalid = {
      // @ts-expect-error Subsystem intentionally excludes arbitrary service names.
      subsystem: 'inventory',
      code: 'unexpected_error',
      message: 'Unhandled error',
      correlationId: null
    } satisfies SupportFailureInput;
    expect(invalid.subsystem).toBe('inventory');
  });
});
