import type { LogEvent } from '@/api/logs';
import { AppTheme } from '@/constants/theme';
import { useRoomCharacters } from '@/hooks/useCharacters';
import type { UserProfileInterface } from '@/hooks/useUser';
import React, { memo, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  formatSignedValue,
  getBattleResultLabel,
  narrowBattlePayload,
} from './logEntryBattle';
import { formatRelativeTime } from './logEntryTime';

interface BattleHistoryModalProps {
  entry: LogEvent | null;
  roomId: string | undefined;
  userProfile: UserProfileInterface;
  onClose: () => void;
}

function capitalizeStatus(status: string | undefined, fallback: string): string {
  const source = status || fallback;
  return `${source.charAt(0).toUpperCase()}${source.slice(1)}`;
}

function resultColor(result: unknown): string {
  if (result === 'players_win') {
    return AppTheme.colors.accent;
  }

  if (result === 'monster_wins') {
    return AppTheme.colors.danger;
  }

  return AppTheme.colors.textMuted;
}

function BattleHistoryModal({ entry, roomId, userProfile, onClose }: BattleHistoryModalProps) {
  const isVisible = entry !== null;
  const { characters } = useRoomCharacters(roomId, userProfile);
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );
  const battle = entry ? narrowBattlePayload(entry.payload) : null;
  const isConcluded = entry?.eventType === 'battle_concluded';
  const title = battle?.name || entry?.summary || 'Battle';
  const status = capitalizeStatus(battle?.status, entry?.eventType === 'battle_discarded' ? 'discarded' : 'concluded');
  const relativeTime = entry ? formatRelativeTime(entry.occurredAt) : '';
  const playerIds = battle?.playerSide?.characterIds ?? [];
  const playerBonuses = battle?.playerSide?.bonuses ?? [];
  const monsters = battle?.monsterSide?.monsters ?? [];
  const monsterBonuses = battle?.monsterSide?.bonuses ?? [];

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.root} testID="battle-history-modal">
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.backdrop}
          testID="battle-history-backdrop"
        />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.status}>{status}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close battle history"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
              testID="battle-history-close"
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          {battle && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {isConcluded && (
                <Text
                  style={[styles.resultChip, { color: resultColor(battle.result) }]}
                  testID="battle-history-result"
                >
                  {getBattleResultLabel(battle.result, '—')}
                </Text>
              )}

              <View style={styles.section}>
                <Text style={styles.playerHeading}>Player Side</Text>
                {playerIds.length > 0 ? playerIds.map((characterId) => {
                  const character = characterById.get(characterId);
                  const hasLevel = character && Number.isFinite(character.level);
                  const hasPower = character && Number.isFinite(character.power);
                  return (
                    <View key={characterId} style={styles.rowLine}>
                      <Text style={styles.bodyText}>
                        {character?.nickname ?? 'Removed character'}
                      </Text>
                      {character && (hasLevel || hasPower) && (
                        <Text style={styles.captionText}>
                          {hasLevel ? `Level ${character.level}` : null}
                          {hasLevel && hasPower ? ' · ' : null}
                          {hasPower ? `Power ${character.power}` : null}
                        </Text>
                      )}
                    </View>
                  );
                }) : (
                  <Text style={styles.captionText}>No player participants</Text>
                )}
                {playerBonuses.length > 0 && (
                  <View style={styles.bonusList}>
                    {playerBonuses.map((bonus) => (
                      <Text key={bonus.id} style={styles.bonusText}>{formatSignedValue(bonus.value)}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.monsterHeading}>Monster Side</Text>
                {monsters.length > 0 ? monsters.map((monster) => (
                  <Text key={monster.id} style={styles.bodyText}>
                    {monster.name || 'Unknown monster'} · Level {Number.isFinite(monster.level) ? monster.level : '—'}
                  </Text>
                )) : (
                  <Text style={styles.captionText}>No monsters recorded</Text>
                )}
                {monsterBonuses.length > 0 && (
                  <View style={styles.bonusList}>
                    {monsterBonuses.map((bonus) => (
                      <Text key={bonus.id} style={styles.bonusText}>{formatSignedValue(bonus.value)}</Text>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.footerText}>{relativeTime}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: AppTheme.spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backdrop: {
    backgroundColor: AppTheme.colors.background,
    bottom: 0,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    gap: AppTheme.spacing.md,
    maxHeight: '86%',
    maxWidth: 560,
    padding: AppTheme.spacing.lg,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: AppTheme.spacing.xs,
  },
  title: {
    color: AppTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  status: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.pill,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  closeText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
  },
  scrollContent: {
    gap: AppTheme.spacing.md,
  },
  resultChip: {
    alignSelf: 'flex-start',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: AppTheme.spacing.sm,
    paddingVertical: AppTheme.spacing.xs,
  },
  section: {
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    gap: AppTheme.spacing.sm,
    padding: AppTheme.spacing.md,
  },
  playerHeading: {
    color: AppTheme.colors.textAccentSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  monsterHeading: {
    color: AppTheme.colors.danger,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  rowLine: {
    gap: AppTheme.spacing.xs,
  },
  bodyText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  captionText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.caption,
  },
  bonusList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppTheme.spacing.sm,
  },
  bonusText: {
    color: AppTheme.colors.accent,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  footerText: {
    color: AppTheme.colors.textMuted,
    textAlign: 'right',
    ...AppTheme.typography.caption,
  },
});

export default memo(BattleHistoryModal);
