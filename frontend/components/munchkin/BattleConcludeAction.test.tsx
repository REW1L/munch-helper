import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import BattleConcludeAction from '@/components/munchkin/BattleConcludeAction';
import { AppTheme } from '@/constants/theme';

describe('BattleConcludeAction', () => {
  it('renders an explicit unselected result selector', () => {
    render(
      <BattleConcludeAction
        dirtyHint={false}
        disabled
        isConcluding={false}
        selectedResult={null}
        onConclude={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-conclude-result-players').getAttribute('role')).toBe('radio');
    expect(screen.getByTestId('battle-conclude-result-monster').getAttribute('role')).toBe('radio');
    expect(screen.getByTestId('battle-conclude-result-monster').textContent).toBe('Monsters Win');
    expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).toBe('true');
  });

  it('selects either result and calls conclude when enabled', () => {
    const onSelectResult = vi.fn();
    const onConclude = vi.fn();
    render(
      <BattleConcludeAction
        dirtyHint={false}
        disabled={false}
        isConcluding={false}
        selectedResult="players_win"
        onConclude={onConclude}
        onSelectResult={onSelectResult}
      />
    );

    fireEvent.click(screen.getByTestId('battle-conclude-result-players'));
    fireEvent.click(screen.getByTestId('battle-conclude-result-monster'));
    fireEvent.click(screen.getByTestId('battle-conclude-button'));

    expect(onSelectResult).toHaveBeenCalledWith('players_win');
    expect(onSelectResult).toHaveBeenCalledWith('monster_wins');
    expect(onConclude).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('battle-conclude-result-players').getAttribute('role')).toBe('radio');
    expect(screen.getByTestId('battle-conclude-button').getAttribute('role')).toBe('button');
  });

  it('uses actionSecondary for the enabled conclude action', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(
        <BattleConcludeAction
          dirtyHint={false}
          disabled={false}
          isConcluding={false}
          selectedResult="players_win"
          onConclude={vi.fn()}
          onSelectResult={vi.fn()}
        />
      );
    });

    const concludeButton = renderer!.root.findByProps({ testID: 'battle-conclude-button' });
    const concludeButtonStyle = StyleSheet.flatten(concludeButton.props.style);

    expect(concludeButtonStyle.backgroundColor).toBe(AppTheme.colors.actionSecondary);
  });

  it('shows dirty and pending disabled states', () => {
    const view = render(
      <BattleConcludeAction
        dirtyHint
        disabled
        isConcluding={false}
        selectedResult="monster_wins"
        onConclude={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-conclude-dirty-hint').textContent).toBe('Save your changes before concluding');
    expect(screen.getByTestId('battle-conclude-button').getAttribute('aria-disabled')).toBe('true');

    view.rerender(
      <BattleConcludeAction
        dirtyHint={false}
        disabled
        isConcluding
        selectedResult="monster_wins"
        onConclude={vi.fn()}
        onSelectResult={vi.fn()}
      />
    );

    expect(screen.getByTestId('battle-conclude-button').textContent).toBe('Concluding...');
  });
});
