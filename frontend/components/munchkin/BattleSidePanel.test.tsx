import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BattleSidePanel from '@/components/munchkin/BattleSidePanel';
import { AppTheme } from '@/constants/theme';

const characters = [
  { id: 'character-1', roomId: 'room-1', userId: 'user-1', nickname: 'Alice', avatar: 0, level: 4, power: 6, class: [], race: [], gender: [], color: '#FFFFFF' },
  { id: 'character-2', roomId: 'room-1', userId: 'user-2', nickname: 'Bob', avatar: 1, level: 2, power: 3, class: [], race: [], gender: [], color: '#FFFFFF' },
];

describe('BattleSidePanel', () => {
  it('adds and removes characters with accessible controls', () => {
    const onAddCharacter = vi.fn();
    const onRemoveCharacter = vi.fn();

    render(
      <BattleSidePanel
        activeParticipants={[{ id: 'character-1', character: characters[0] }]}
        bonuses={[]}
        characters={characters}
        selectedCharacterIds={['character-1']}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={10}
        onAddBonus={vi.fn()}
        onAddCharacter={onAddCharacter}
        onRemoveBonus={vi.fn()}
        onRemoveCharacter={onRemoveCharacter}
      />
    );

    fireEvent.click(screen.getByTestId('select-character-character-2'));
    fireEvent.click(screen.getByTestId('add-character'));
    fireEvent.click(screen.getByTestId('remove-character-character-1'));

    expect(onAddCharacter).toHaveBeenCalledWith('character-2');
    expect(onRemoveCharacter).toHaveBeenCalledWith('character-1');
    expect(screen.getByLabelText('Add selected character')).toBeTruthy();
  });

  it('renders active and removed participant states while excluding tombstones from the displayed total', () => {
    render(
      <BattleSidePanel
        activeParticipants={[{ id: 'character-1', character: characters[0] }]}
        bonuses={[]}
        characters={characters}
        removedCharacterIds={['character-removed']}
        selectedCharacterIds={['character-1', 'character-removed']}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={10}
        onAddBonus={vi.fn()}
        onAddCharacter={vi.fn()}
        onRemoveBonus={vi.fn()}
        onRemoveCharacter={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-participant-active').textContent).toContain('Alice · Power 10');
    expect(screen.getByTestId('battle-participant-removed').textContent).toContain('Removed character');
    expect(screen.queryByText(/character-removed/)).toBeNull();
    expect(screen.getByLabelText('character-removed - removed from room')).toBeTruthy();
    expect(screen.getByLabelText('Drop removed character from draft')).toBeTruthy();
    expect(screen.getByTestId('discard-removed-character-character-removed')).toBeTruthy();
    expect(screen.queryByTestId('remove-character-character-removed')).toBeNull();
    expect(screen.getByTestId('battle-players-total').textContent).toBe('10');
    expect(screen.queryByText('Unavailable · character-removed')).toBeNull();
  });

  it('updates active participant rows from supplied live character data without adding non-participants', () => {
    const { rerender } = render(
      <BattleSidePanel
        activeParticipants={[{ id: 'character-1', character: characters[0] }]}
        bonuses={[]}
        characters={characters}
        selectedCharacterIds={['character-1']}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={10}
        onAddBonus={vi.fn()}
        onAddCharacter={vi.fn()}
        onRemoveBonus={vi.fn()}
        onRemoveCharacter={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-participant-active').textContent).toContain('Alice · Power 10');

    const updatedCharacters = [
      { ...characters[0], nickname: 'Alice Updated', level: 8, power: 9 },
      characters[1],
    ];
    rerender(
      <BattleSidePanel
        activeParticipants={[{ id: 'character-1', character: updatedCharacters[0] }]}
        bonuses={[]}
        characters={updatedCharacters}
        selectedCharacterIds={['character-1']}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={17}
        onAddBonus={vi.fn()}
        onAddCharacter={vi.fn()}
        onRemoveBonus={vi.fn()}
        onRemoveCharacter={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-participant-active').textContent).toContain('Alice Updated · Power 17');
    expect(screen.getByTestId('battle-players-total').textContent).toBe('17');
    expect(screen.queryByText('Bob · Power 5')).toBeNull();
  });

  it('opens a Figma-inspired dialog to add monsters and displays total', () => {
    const onAddMonster = vi.fn();
    const onRemoveMonster = vi.fn();

    render(
      <BattleSidePanel
        bonuses={[]}
        monsters={[{ id: 'monster-1', name: 'Level 1 Monster', level: 1 }]}
        side="monsters"
        title="Monster Side"
        toneColor={AppTheme.colors.danger}
        total={1}
        onAddBonus={vi.fn()}
        onAddMonster={onAddMonster}
        onRemoveBonus={vi.fn()}
        onRemoveMonster={onRemoveMonster}
      />
    );

    fireEvent.click(screen.getByTestId('open-add-monster'));
    fireEvent.change(screen.getByTestId('monster-name-input'), { target: { value: 'Level 6 Monster' } });
    fireEvent.change(screen.getByTestId('monster-level-input'), { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('save-monster'));
    fireEvent.click(screen.getByTestId('remove-monster-monster-1'));

    expect(screen.getByTestId('battle-monsters-total').textContent).toBe('1');
    expect(onAddMonster).toHaveBeenCalledWith('Level 6 Monster', 6);
    expect(onRemoveMonster).toHaveBeenCalledWith('monster-1');
  });

  it('prefills the default monster name and level in the add dialog', () => {
    const onAddMonster = vi.fn();

    render(
      <BattleSidePanel
        bonuses={[]}
        monsters={[]}
        side="monsters"
        title="Monster Side"
        toneColor={AppTheme.colors.danger}
        total={0}
        onAddBonus={vi.fn()}
        onAddMonster={onAddMonster}
        onRemoveBonus={vi.fn()}
        onRemoveMonster={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('open-add-monster'));
    expect(screen.getByDisplayValue('Fungeater')).toBeTruthy();
    expect(screen.getByDisplayValue('25')).toBeTruthy();

    fireEvent.click(screen.getByTestId('save-monster'));

    expect(onAddMonster).toHaveBeenCalledWith('Fungeater', 25);
  });

  it('adds preset bonuses and removes existing bonuses without rendering an in-place edit input', () => {
    const onAddBonus = vi.fn();
    const onRemoveBonus = vi.fn();

    render(
      <BattleSidePanel
        bonuses={[{ id: 'bonus-1', value: -1 }]}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={-1}
        onAddBonus={onAddBonus}
        onRemoveBonus={onRemoveBonus}
      />
    );

    fireEvent.click(screen.getByTestId('add-bonus-players--10'));
    fireEvent.click(screen.getByTestId('add-bonus-players-10'));
    fireEvent.click(screen.getByTestId('remove-bonus-players-bonus-1'));

    expect(onAddBonus).toHaveBeenNthCalledWith(1, -10);
    expect(onAddBonus).toHaveBeenNthCalledWith(2, 10);
    expect(onRemoveBonus).toHaveBeenCalledWith('bonus-1');
    expect(screen.queryByTestId('bonus-value-input-bonus-1')).toBeNull();
  });
});
