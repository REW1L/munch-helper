import { setStringAsync } from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalization } from '@/i18n';

export const COPIED_LABEL_RESET_MS = 1500;

interface UseRoomCodeClipboardResult {
  buttonLabel: string;
  accessibilityLabel: string;
  copyRoomCode: () => Promise<void>;
}

export function useRoomCodeClipboard(roomCode: string): UseRoomCodeClipboardResult {
  const { t } = useLocalization();
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

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
    setIsCopied(false);
    clearResetTimeout();
  }, [clearResetTimeout, roomCode]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearResetTimeout();
    };
  }, [clearResetTimeout]);

  return {
    buttonLabel: isCopied ? t('rooms.copied') : t('rooms.copy'),
    accessibilityLabel: roomCode.length > 0 ? t('rooms.copyRoomCodeValue', { roomCode }) : t('rooms.copyRoomCode'),
    copyRoomCode,
  };
}
