import type { LogEvent } from '@/api/logs';
import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatRelativeTime } from './logEntryTime';

interface LogEntryProps {
  entry: LogEvent;
}

interface CharacterDisplay {
  name: string;
  avatarId: number;
  color: string;
}

interface DiffRow {
  field: string;
  prev: string;
  next: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'none';
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsedValue: unknown = JSON.parse(trimmedValue);

        if (Array.isArray(parsedValue)) {
          return formatDisplayValue(parsedValue);
        }
      } catch {
        return value;
      }
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '<Empty>';
    }

    return value.map(formatDisplayValue).join(', ');
  }

  return String(value);
}

function getCharacterDisplay(payload: unknown, summary: string): CharacterDisplay {
  const character = isRecord(payload) && isRecord(payload.character) ? payload.character : {};
  const rawName = typeof character.name === 'string' ? character.name.trim() : '';
  const rawAvatarId = typeof character.avatarId === 'number' && Number.isInteger(character.avatarId)
    ? character.avatarId
    : 0;
  const rawColor = typeof character.color === 'string' && character.color.trim()
    ? character.color
    : AppTheme.colors.surfaceWarm;

  return {
    name: rawName || summary || 'Unknown character',
    avatarId: rawAvatarId,
    color: rawColor,
  };
}

function getDiffRows(payload: unknown): DiffRow[] {
  if (!isRecord(payload) || !isRecord(payload.changes)) {
    return [];
  }

  return Object.entries(payload.changes).flatMap(([field, change]) => {
    if (!isRecord(change)) {
      return [];
    }

    return [{
      field,
      prev: formatDisplayValue(change.prev),
      next: formatDisplayValue(change.next),
    }];
  });
}

function appendTime(label: string, relativeTime: string): string {
  return relativeTime ? `${label}, ${relativeTime}` : label;
}

function getActionAccessibilityLabel(
  name: string,
  summary: string,
  action: 'created' | 'removed',
  relativeTime: string,
): string {
  const baseLabel = name === summary ? summary : `${name} ${action}`;
  return appendTime(baseLabel, relativeTime);
}

function getUpdateAccessibilityLabel(
  name: string,
  summary: string,
  diffRows: DiffRow[],
  relativeTime: string,
): string {
  if (diffRows.length === 0) {
    return appendTime(summary || name, relativeTime);
  }

  const changes = diffRows
    .map(({ field, prev, next }) => `${field} changed from ${prev} to ${next}`)
    .join(', ');

  return appendTime(`${name}, ${changes}`, relativeTime);
}

function getNeutralAccessibilityLabel(summary: string, relativeTime: string): string {
  return appendTime(summary || 'Log entry', relativeTime);
}

function LogEntry({ entry }: LogEntryProps) {
  const relativeTime = formatRelativeTime(entry.occurredAt);
  const character = useMemo(
    () => getCharacterDisplay(entry.payload, entry.summary),
    [entry.payload, entry.summary],
  );
  const avatarSource = avatars[character.avatarId] ?? avatars[0];

  if (entry.eventType === 'character_created' || entry.eventType === 'character_deleted') {
    const action = entry.eventType === 'character_created' ? 'created' : 'removed';

    return (
      <View
        accessible
        accessibilityLabel={getActionAccessibilityLabel(character.name, entry.summary, action, relativeTime)}
        style={styles.row}
        testID="log-entry-row"
      >
        <View style={[styles.avatarWrapper, { backgroundColor: character.color }]}>
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={avatarSource}
            style={styles.avatar}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{character.name}</Text>
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>
          <Text style={styles.actionLabel}>{action}</Text>
        </View>
      </View>
    );
  }

  if (entry.eventType === 'character_updated') {
    const diffRows = getDiffRows(entry.payload);
    const accessibilityLabel = getUpdateAccessibilityLabel(
      character.name,
      entry.summary,
      diffRows,
      relativeTime,
    );

    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={styles.row}
        testID="log-entry-row"
      >
        <View style={[styles.avatarWrapper, { backgroundColor: character.color }]}>
          <Image
            accessibilityElementsHidden
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            source={avatarSource}
            style={styles.avatar}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{character.name}</Text>
            <Text style={styles.timestamp}>{relativeTime}</Text>
          </View>
          {diffRows.length > 0 ? (
            <View style={styles.diffList}>
              {diffRows.map((diffRow) => (
                <View key={diffRow.field} style={styles.diffRow} testID="log-entry-diff-row">
                  <Text style={styles.fieldLabel}>{diffRow.field}</Text>
                  <Text style={styles.diffValue}>{diffRow.prev} → {diffRow.next}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.summaryFallback}>{entry.summary}</Text>
          )}
        </View>
      </View>
    );
  }

  // Story 6.7 owns battle-event variants + completed-battle drill-in.
  return (
    <View
      accessible
      accessibilityLabel={getNeutralAccessibilityLabel(entry.summary, relativeTime)}
      style={styles.neutralRow}
      testID="log-entry-row"
    >
      <View style={styles.neutralContent}>
        <Text style={styles.summaryFallback}>{entry.summary}</Text>
        <Text style={styles.timestamp}>{relativeTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AppTheme.colors.elevated,
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    gap: AppTheme.spacing.sm,
    padding: AppTheme.spacing.md,
  },
  neutralRow: {
    backgroundColor: AppTheme.colors.elevated,
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    padding: AppTheme.spacing.md,
  },
  avatarWrapper: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.pill,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  avatar: {
    borderRadius: AppTheme.radius.pill,
    height: 48,
    width: 48,
  },
  content: {
    flex: 1,
    gap: AppTheme.spacing.xs,
  },
  neutralContent: {
    gap: AppTheme.spacing.xs,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    color: AppTheme.colors.textAccentSoft,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  timestamp: {
    color: AppTheme.colors.textMuted,
    textAlign: 'right',
    ...AppTheme.typography.caption,
  },
  actionLabel: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.caption,
  },
  diffList: {
    gap: AppTheme.spacing.xs,
  },
  diffRow: {
    gap: AppTheme.spacing.xs,
  },
  fieldLabel: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.caption,
  },
  diffValue: {
    color: AppTheme.colors.accent,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  summaryFallback: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
});

export default memo(LogEntry);
