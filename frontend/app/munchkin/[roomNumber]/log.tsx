import type { LogEvent } from '@/api/logs';
import { AppTheme } from '@/constants/theme';
import { useRoomLogs } from '@/hooks/useRoomLogs';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoomHistoryLogScreen() {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    errorMessage,
    loadNextPage,
    refresh,
  } = useRoomLogs(roomId);
  const isFirstPageError = Boolean(errorMessage && entries.length === 0 && !isLoading);
  const isNextPageError = Boolean(errorMessage && entries.length > 0 && !isLoading);

  const handleInitialRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleNextPageRetry = useCallback(() => {
    void loadNextPage();
  }, [loadNextPage]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void loadNextPage();
  }, [hasNextPage, isFetchingNextPage, loadNextPage]);

  const renderLogPlaceholder = useCallback(({ item }: { item: LogEvent }) => (
    <View style={styles.placeholderRow}>
      {/* Story 6.6/6.7 replace this placeholder render seam with LogEntry variants. */}
      <Text style={styles.placeholderSummary}>{item.summary}</Text>
      <Text style={styles.placeholderMeta}>{item.eventType}</Text>
    </View>
  ), []);

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerState}>
          <ActivityIndicator color={AppTheme.colors.accent} />
          <Text style={styles.stateText}>Loading more history</Text>
        </View>
      );
    }

    if (isNextPageError) {
      return (
        <View style={styles.footerState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            accessibilityLabel="Retry loading older history"
            accessibilityRole="button"
            onPress={handleNextPageRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }, [errorMessage, handleNextPageRetry, isFetchingNextPage, isNextPageError]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      {isLoading && (
        <View style={styles.stateBlock}>
          <ActivityIndicator color={AppTheme.colors.accent} />
          <Text style={styles.stateText}>Loading history</Text>
        </View>
      )}

      {isFirstPageError && (
        <View style={styles.stateBlock}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            accessibilityLabel="Retry loading room history"
            accessibilityRole="button"
            onPress={handleInitialRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isFirstPageError && (
        <FlatList
          contentContainerStyle={entries.length === 0 ? styles.emptyContent : styles.listContent}
          data={entries}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={null}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          renderItem={renderLogPlaceholder}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  listContent: {
    padding: AppTheme.spacing.lg,
    gap: AppTheme.spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    padding: AppTheme.spacing.lg,
  },
  placeholderRow: {
    backgroundColor: AppTheme.colors.elevated,
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    gap: AppTheme.spacing.xs,
    padding: AppTheme.spacing.md,
  },
  placeholderSummary: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  placeholderMeta: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.caption,
  },
  stateBlock: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.md,
    padding: AppTheme.spacing.lg,
  },
  stateText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  errorText: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: AppTheme.spacing.lg,
  },
  retryButtonText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  footerState: {
    alignItems: 'center',
    gap: AppTheme.spacing.sm,
    padding: AppTheme.spacing.lg,
  },
});
