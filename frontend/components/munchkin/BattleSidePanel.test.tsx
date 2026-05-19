import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BattleSidePanel from '@/components/munchkin/BattleSidePanel';
import { AppTheme } from '@/constants/theme';

const characters = [
  { id: 'character-1', roomId: 'room-1', userId: 'user-1', nickname: 'Alice', avatar: 0, level: 4, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
  { id: 'character-2', roomId: 'room-1', userId: 'user-2', nickname: 'Bob', avatar: 1, level: 2, power: 0, class: [], race: [], gender: [], color: '#FFFFFF' },
];

describe('BattleSidePanel', () => {
  it('adds and removes characters with accessible controls', () => {
    const onAddCharacter = vi.fn();
    const onRemoveCharacter = vi.fn();

    render(
      <BattleSidePanel
        bonuses={[]}
        characters={characters}
        selectedCharacterIds={['character-1']}
        side="players"
        title="Player Side"
        toneColor={AppTheme.colors.accent}
        total={4}
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
