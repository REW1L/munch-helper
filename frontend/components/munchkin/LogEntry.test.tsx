import type { LogEvent } from '@/api/logs';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import LogEntry from './LogEntry';

vi.mock('@/constants/avatars', () => ({
  default: Array.from({ length: 10 }, (_, index) => index + 1),
}));

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Image: 'Image',
  };
});

vi.mock('./logEntryTime', () => ({
  formatRelativeTime: vi.fn(() => '3m ago'),
}));

const baseEntry: LogEvent = {
  id: 'log-1',
  roomId: 'room-1',
  eventType: 'character_created',
  actorId: 'user-1',
  summary: 'Thorin created',
  payload: {
    character: {
      id: 'char-1',
      name: 'Thorin',
      avatarId: 2,
      color: '#AABBCC',
    },
  },
  occurredAt: '2026-05-21T11:57:00.000Z',
};

function renderLogEntry(entry: LogEvent, onPress?: (entry: LogEvent) => void) {
  let renderer: any;

  act(() => {
    renderer = TestRenderer.create(<LogEntry entry={entry} onPress={onPress} />);
  });

  return renderer!;
}

function findTextNode(renderer: any, text: string) {
  return renderer.root.find((node: { props?: { children?: unknown } }) => {
    const children = node.props?.children;
    return children === text || (Array.isArray(children) && children.join('') === text);
  });
}

function getRow(renderer: any) {
  return renderer.root.findByProps({ testID: 'log-entry-row' });
}

describe('LogEntry', () => {
  it('renders a character-created entry with avatar, name, label, and accessibility text', () => {
    const renderer = renderLogEntry(baseEntry);

    expect(findTextNode(renderer, 'Thorin')).toBeTruthy();
    expect(findTextNode(renderer, 'created')).toBeTruthy();
    expect(renderer.root.findAllByType(Image)).toHaveLength(1);
    expect(getRow(renderer).props.accessibilityLabel).toBe('Thorin created, 3m ago');
  });

  it('renders a character-deleted entry as removed', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      eventType: 'character_deleted',
      summary: 'Thorin removed',
    });

    expect(findTextNode(renderer, 'Thorin')).toBeTruthy();
    expect(findTextNode(renderer, 'removed')).toBeTruthy();
    expect(getRow(renderer).props.accessibilityLabel).toBe('Thorin removed, 3m ago');
  });

  it('renders one diff row per changed field for character-updated entries', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      eventType: 'character_updated',
      summary: 'Thorin updated',
      payload: {
        character: {
          id: 'char-1',
          name: 'Thorin',
          avatarId: 2,
          color: '#AABBCC',
        },
        changes: {
          level: { prev: 2, next: 3 },
          class: { prev: 'Wizard', next: 'Warrior' },
        },
      },
    });

    expect(findTextNode(renderer, 'level')).toBeTruthy();
    expect(findTextNode(renderer, '2 → 3')).toBeTruthy();
    expect(findTextNode(renderer, 'class')).toBeTruthy();
    expect(findTextNode(renderer, 'Wizard → Warrior')).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'log-entry-diff-row' })).toHaveLength(2);
    expect(getRow(renderer).props.accessibilityLabel).toBe(
      'Thorin, level changed from 2 to 3, class changed from Wizard to Warrior, 3m ago',
    );
  });

  it('formats array diffs as readable lists and empty arrays as Empty', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      eventType: 'character_updated',
      summary: 'Thorin updated',
      payload: {
        character: {
          id: 'char-1',
          name: 'Thorin',
          avatarId: 2,
          color: '#AABBCC',
        },
        changes: {
          race: { prev: ['Human', 'Elf'], next: ['Human', 'Dwarf'] },
          class: { prev: [], next: ['Warrior'] },
        },
      },
    });

    expect(findTextNode(renderer, 'Human, Elf → Human, Dwarf')).toBeTruthy();
    expect(findTextNode(renderer, '<Empty> → Warrior')).toBeTruthy();
    expect(getRow(renderer).props.accessibilityLabel).toBe(
      'Thorin, race changed from Human, Elf to Human, Dwarf, class changed from <Empty> to Warrior, 3m ago',
    );
  });

  it('formats stringified array diffs as readable lists and empty arrays as Empty', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      eventType: 'character_updated',
      summary: 'Thorin updated',
      payload: {
        character: {
          id: 'char-1',
          name: 'Thorin',
          avatarId: 2,
          color: '#AABBCC',
        },
        changes: {
          race: { prev: '["Human","Elf"]', next: '["Human","Dwarf"]' },
          class: { prev: '[]', next: '["Warrior"]' },
        },
      },
    });

    expect(findTextNode(renderer, 'Human, Elf → Human, Dwarf')).toBeTruthy();
    expect(findTextNode(renderer, '<Empty> → Warrior')).toBeTruthy();
    expect(getRow(renderer).props.accessibilityLabel).toBe(
      'Thorin, race changed from Human, Elf to Human, Dwarf, class changed from <Empty> to Warrior, 3m ago',
    );
  });

  it('falls back to summary when a character update has no diff rows', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      eventType: 'character_updated',
      summary: 'Thorin updated: level 2 → 3',
      payload: {
        character: { name: 'Thorin', avatarId: 0, color: '#AABBCC' },
        changes: {},
      },
    });

    expect(findTextNode(renderer, 'Thorin updated: level 2 → 3')).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'log-entry-diff-row' })).toHaveLength(0);
  });

  it('degrades safely when payload character fields are missing', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      summary: 'Someone created',
      payload: {
        character: {},
      },
    });

    expect(findTextNode(renderer, 'Someone created')).toBeTruthy();
    expect(findTextNode(renderer, 'created')).toBeTruthy();
    expect(getRow(renderer).props.accessibilityLabel).toBe('Someone created, 3m ago');
  });

  it('falls back safely for out-of-range avatar ids', () => {
    const renderer = renderLogEntry({
      ...baseEntry,
      payload: {
        character: {
          name: 'Thorin',
          avatarId: 99,
          color: '#AABBCC',
        },
      },
    });

    const image = renderer.root.findByType(Image);
    const wrapperStyle = StyleSheet.flatten(image.parent?.props.style);
    expect(image.props.source).toBe(1);
    expect(wrapperStyle.backgroundColor).toContain('170,187,204');
  });

  it('renders battle-started as a non-interactive battle row', () => {
    const onPress = vi.fn();
    const entry: LogEvent = {
      ...baseEntry,
      eventType: 'battle_started',
      summary: 'Battle started against the Plutonium Dragon',
      payload: {
        battle: { id: 'battle-1', name: 'Plutonium Dragon' },
      },
    };
    const renderer = renderLogEntry(entry, onPress);

    expect(findTextNode(renderer, '⚔️')).toBeTruthy();
    expect(findTextNode(renderer, 'Plutonium Dragon')).toBeTruthy();
    expect(findTextNode(renderer, 'started')).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'log-entry-diff-row' })).toHaveLength(0);
    expect(getRow(renderer).props.accessibilityRole).toBeUndefined();
    expect(getRow(renderer).props.accessibilityLabel).toBe('Battle Plutonium Dragon, started, 3m ago.');
    expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders a tappable players-win battle-concluded row', () => {
    const onPress = vi.fn();
    const entry: LogEvent = {
      ...baseEntry,
      eventType: 'battle_concluded',
      summary: 'Battle concluded',
      payload: {
        battle: {
          id: 'battle-1',
          name: 'Cave Dragon',
          result: 'players_win',
          playerSide: { characterIds: ['char-1'], bonuses: [] },
        },
      },
    };
    const renderer = renderLogEntry(entry, onPress);
    const row = getRow(renderer);

    expect(findTextNode(renderer, '⚔️')).toBeTruthy();
    expect(findTextNode(renderer, 'Cave Dragon')).toBeTruthy();
    expect(findTextNode(renderer, 'Players Win')).toBeTruthy();
    expect(row.type).toBe(TouchableOpacity);
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe(
      'Battle Cave Dragon, Players Win, 3m ago. Double-tap to open battle record.',
    );

    act(() => {
      row.props.onPress();
    });

    expect(onPress).toHaveBeenCalledOnce();
    expect(onPress).toHaveBeenCalledWith(entry);
  });

  it('renders monster-win and neutral battle-concluded result labels', () => {
    const monsterWinRenderer = renderLogEntry({
      ...baseEntry,
      eventType: 'battle_concluded',
      summary: 'Battle concluded',
      payload: { battle: { id: 'battle-1', name: 'Squidzilla', result: 'monster_wins' } },
    });
    const neutralRenderer = renderLogEntry({
      ...baseEntry,
      eventType: 'battle_concluded',
      summary: 'Battle concluded',
      payload: { battle: { id: 'battle-2', name: 'Unknown Result', result: null } },
    });

    expect(findTextNode(monsterWinRenderer, 'Monster Wins')).toBeTruthy();
    expect(findTextNode(neutralRenderer, 'Concluded')).toBeTruthy();
  });

  it('renders battle-discarded as tappable without a result chip', () => {
    const onPress = vi.fn();
    const entry: LogEvent = {
      ...baseEntry,
      eventType: 'battle_discarded',
      summary: 'Battle discarded',
      payload: {
        battle: {
          id: 'battle-1',
          name: 'Abandoned Fight',
          monsterSide: { monsters: [], bonuses: [] },
        },
      },
    };
    const renderer = renderLogEntry(entry, onPress);
    const row = getRow(renderer);

    expect(findTextNode(renderer, 'Abandoned Fight')).toBeTruthy();
    expect(findTextNode(renderer, 'discarded')).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'log-entry-battle-result' })).toHaveLength(0);
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe(
      'Battle Abandoned Fight, discarded, 3m ago. Double-tap to open battle record.',
    );

    act(() => {
      row.props.onPress();
    });

    expect(onPress).toHaveBeenCalledWith(entry);
  });

  it('keeps concluded and discarded rows non-interactive when battle payload is unusable', () => {
    const onPress = vi.fn();
    const missingPayloadRenderer = renderLogEntry({
      ...baseEntry,
      eventType: 'battle_concluded',
      summary: 'Battle concluded from summary',
      payload: {},
    }, onPress);
    const missingIdRenderer = renderLogEntry({
      ...baseEntry,
      eventType: 'battle_discarded',
      summary: 'Battle discarded from summary',
      payload: { battle: { name: 'No id' } },
    }, onPress);

    expect(findTextNode(missingPayloadRenderer, 'Battle concluded from summary')).toBeTruthy();
    expect(findTextNode(missingPayloadRenderer, 'Concluded')).toBeTruthy();
    expect(getRow(missingPayloadRenderer).props.accessibilityRole).toBeUndefined();
    expect(getRow(missingPayloadRenderer).props.accessibilityLabel).toBe(
      'Battle concluded from summary, Concluded, 3m ago.',
    );
    expect(getRow(missingIdRenderer).props.accessibilityRole).toBeUndefined();
    expect(getRow(missingIdRenderer).props.accessibilityLabel).toBe(
      'Battle discarded from summary, discarded, 3m ago.',
    );
    expect(missingPayloadRenderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(missingIdRenderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides avatar image from independent accessibility traversal', () => {
    const renderer = renderLogEntry(baseEntry);
    const image = renderer.root.findByType(Image);

    expect(image.props.accessible).toBe(false);
    expect(image.props.accessibilityElementsHidden).toBe(true);
    expect(image.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
