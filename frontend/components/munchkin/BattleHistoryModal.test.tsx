import type { Character } from '@/api/characters';
import type { LogEvent } from '@/api/logs';
import { useRoomCharacters } from '@/hooks/useCharacters';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BattleHistoryModal from './BattleHistoryModal';

vi.mock('@/hooks/useCharacters', () => ({
  useRoomCharacters: vi.fn(),
}));

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) => visible ? children : null,
  };
});

vi.mock('./logEntryTime', () => ({
  formatRelativeTime: vi.fn(() => '7m ago'),
}));

const baseEntry: LogEvent = {
  id: 'log-1',
  roomId: 'ROOM42',
  eventType: 'battle_concluded',
  actorId: 'user-1',
  summary: 'Battle summary fallback',
  occurredAt: '2026-05-21T12:00:00.000Z',
  payload: {
    battle: {
      id: 'battle-1',
      name: 'Cave Dragon',
      status: 'concluded',
      result: 'players_win',
      playerSide: {
        characterIds: ['c1', 'c2'],
        bonuses: [{ id: 'b1', value: 5 }],
      },
      monsterSide: {
        monsters: [{ id: 'm1', name: 'Goblin', level: 3 }],
        bonuses: [{ id: 'b2', value: -2 }],
      },
    },
  },
};

const characters: Character[] = [
  {
    id: 'c1',
    roomId: 'ROOM42',
    userId: 'user-1',
    nickname: 'Thrognar',
    avatar: 0,
    color: '#AABBCC',
    level: 5,
    power: 9,
    class: [],
    race: [],
    gender: [],
  },
  {
    id: 'c2',
    roomId: 'ROOM42',
    userId: 'user-2',
    nickname: 'Zara',
    avatar: 1,
    color: '#BBCCDD',
    level: 4,
    power: 7,
    class: [],
    race: [],
    gender: [],
  },
];

function mockCharacters(nextCharacters: Character[]) {
  vi.mocked(useRoomCharacters).mockReturnValue({
    characters: nextCharacters,
    realtimeUpdateSignals: {},
    isLoading: false,
    errorMessage: null,
    isCreateBlocked: false,
    isConnected: false,
    isReconnecting: false,
    isTimedOut: false,
    refresh: vi.fn(async () => undefined),
    reconnect: vi.fn(async () => undefined),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  });
}

function renderModal(entry: LogEvent | null = baseEntry, onClose = vi.fn()) {
  let renderer: any;

  act(() => {
    renderer = TestRenderer.create(
      <BattleHistoryModal entry={entry} roomId="ROOM42" onClose={onClose} />
    );
  });

  return { renderer: renderer!, onClose };
}

function findTextNode(renderer: any, text: string) {
  return renderer.root.find((node: { props?: { children?: unknown } }) => {
    const children = node.props?.children;
    return children === text || (Array.isArray(children) && children.join('') === text);
  });
}

describe('BattleHistoryModal', () => {
  beforeEach(() => {
    mockCharacters(characters);
  });

  it('renders a concluded battle snapshot from the entry payload', () => {
    const { renderer } = renderModal();

    expect(findTextNode(renderer, 'Cave Dragon')).toBeTruthy();
    expect(findTextNode(renderer, 'Concluded')).toBeTruthy();
    expect(findTextNode(renderer, 'Players Win')).toBeTruthy();
    expect(findTextNode(renderer, 'Thrognar')).toBeTruthy();
    expect(findTextNode(renderer, 'Level 5 · Power 9')).toBeTruthy();
    expect(findTextNode(renderer, 'Zara')).toBeTruthy();
    expect(findTextNode(renderer, '+5')).toBeTruthy();
    expect(findTextNode(renderer, 'Goblin · Level 3')).toBeTruthy();
    expect(findTextNode(renderer, '-2')).toBeTruthy();
    expect(findTextNode(renderer, '7m ago')).toBeTruthy();
  });

  it('renders removed-character fallback for unresolved character ids', () => {
    mockCharacters([characters[0]]);
    const { renderer } = renderModal();

    expect(findTextNode(renderer, 'Thrognar')).toBeTruthy();
    expect(findTextNode(renderer, 'Removed character')).toBeTruthy();
  });

  it('renders discarded battle details without a result chip', () => {
    const { renderer } = renderModal({
      ...baseEntry,
      eventType: 'battle_discarded',
      payload: {
        battle: {
          id: 'battle-1',
          name: 'Abandoned Fight',
          status: 'discarded',
          playerSide: { characterIds: ['c1'], bonuses: [{ id: 'b1', value: 2 }] },
          monsterSide: { monsters: [], bonuses: [] },
        },
      },
    });

    expect(findTextNode(renderer, 'Abandoned Fight')).toBeTruthy();
    expect(findTextNode(renderer, 'Discarded')).toBeTruthy();
    expect(findTextNode(renderer, 'Thrognar')).toBeTruthy();
    expect(findTextNode(renderer, '+2')).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'battle-history-result' })).toHaveLength(0);
  });

  it('calls onClose from the close affordance', () => {
    const { renderer, onClose } = renderModal();
    const closeButton = renderer.root.findByProps({ testID: 'battle-history-close' });

    expect(closeButton.type).toBe(TouchableOpacity);
    expect(closeButton.props.accessibilityRole).toBe('button');
    expect(closeButton.props.accessibilityLabel).toBe('Close battle history');

    act(() => {
      closeButton.props.onPress();
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses defensive display fallbacks for partial battle snapshots', () => {
    const { renderer } = renderModal({
      ...baseEntry,
      summary: 'Summary Battle Name',
      payload: {
        battle: {
          id: 'battle-1',
          status: 'concluded',
          result: null,
          playerSide: { characterIds: [], bonuses: undefined },
          monsterSide: { monsters: [{ id: 'm1', level: undefined }], bonuses: [] },
        },
      },
    });

    expect(findTextNode(renderer, 'Summary Battle Name')).toBeTruthy();
    expect(findTextNode(renderer, '—')).toBeTruthy();
    expect(findTextNode(renderer, 'Unknown monster · Level —')).toBeTruthy();
  });

  it('renders no modal tree when entry is null', () => {
    const { renderer } = renderModal(null);

    expect(renderer.toJSON()).toBeNull();
  });
});
