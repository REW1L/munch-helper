import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useReconnectOnForeground(enabled: boolean, onForeground: () => void): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        onForeground();
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [enabled, onForeground]);
}
