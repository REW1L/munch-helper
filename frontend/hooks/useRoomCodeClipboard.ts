import { setStringAsync } from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';

export const COPIED_LABEL_RESET_MS = 1500;

interface UseRoomCodeClipboardResult {
  buttonLabel: 'Copy' | 'Copied ✓';
  accessibilityLabel: string;
  copyRoomCode: () => Promise<void>;
}

export function useRoomCodeClipboard(roomCode: string): UseRoomCodeClipboardResult {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const roomCodeRef = useRef(roomCode);

  const clearResetTimeout = useCallback(() => {
    if (!resetTimeoutRef.current) {
      return;
    }

    clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = null;
  }, []);

  const copyRoomCode = useCallback(async () => {
    const requestedRoomCode = roomCodeRef.current;
    await setStringAsync(requestedRoomCode);
    if (!isMountedRef.current || requestedRoomCode !== roomCodeRef.current) {
      return;
    }

    setIsCopied(true);

    clearResetTimeout();
    resetTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      setIsCopied(false);
      resetTimeoutRef.current = null;
    }, COPIED_LABEL_RESET_MS);
  }, [clearResetTimeout]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
    setIsCopied(false);
    clearResetTimeout();
  }, [clearResetTimeout, roomCode]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearResetTimeout();
    };
  }, [clearResetTimeout]);

  return {
    buttonLabel: isCopied ? 'Copied ✓' : 'Copy',
    accessibilityLabel: `Copy room code ${roomCode}`,
    copyRoomCode,
  };
}
