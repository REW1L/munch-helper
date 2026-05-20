import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import BattleDiscardAction from '@/components/munchkin/BattleDiscardAction';
import { AppTheme } from '@/constants/theme';

describe('BattleDiscardAction', () => {
  it('opens confirmation before calling discard', () => {
    const onRequestConfirm = vi.fn();
    const onConfirmDiscard = vi.fn();

    render(
      <BattleDiscardAction
        confirmVisible={false}
        isDiscarding={false}
        onCancelConfirm={vi.fn()}
        onConfirmDiscard={onConfirmDiscard}
        onRequestConfirm={onRequestConfirm}
      />
    );

    fireEvent.click(screen.getByTestId('battle-discard-button'));

    expect(onRequestConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmDiscard).not.toHaveBeenCalled();
    expect(screen.getByTestId('battle-discard-button').getAttribute('role')).toBe('button');
    expect(screen.getByTestId('battle-discard-button').getAttribute('aria-label')).toBe('Discard battle');
  });

  it('confirms and cancels through the dialog', () => {
    const onCancelConfirm = vi.fn();
    const onConfirmDiscard = vi.fn();

    render(
      <BattleDiscardAction
        confirmVisible
        isDiscarding={false}
        onCancelConfirm={onCancelConfirm}
        onConfirmDiscard={onConfirmDiscard}
        onRequestConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Discard battle?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep battle' }));
    expect(onCancelConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmDiscard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirmDiscard).toHaveBeenCalledTimes(1);
  });

  it('uses danger and disabled styling', () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(
        <BattleDiscardAction
          confirmVisible={false}
          isDiscarding={false}
          onCancelConfirm={vi.fn()}
          onConfirmDiscard={vi.fn()}
          onRequestConfirm={vi.fn()}
        />
      );
    });

    const enabledButton = renderer!.root.findByProps({ testID: 'battle-discard-button' });
    expect(StyleSheet.flatten(enabledButton.props.style).backgroundColor).toBe(AppTheme.colors.danger);

    act(() => {
      renderer!.update(
        <BattleDiscardAction
          confirmVisible={false}
          isDiscarding
          onCancelConfirm={vi.fn()}
          onConfirmDiscard={vi.fn()}
          onRequestConfirm={vi.fn()}
        />
      );
    });

    const disabledButton = renderer!.root.findByProps({ testID: 'battle-discard-button' });
    expect(disabledButton.props.disabled).toBe(true);
    expect(StyleSheet.flatten(disabledButton.props.style).backgroundColor).toBe(AppTheme.colors.surfaceSubtle);
  });
});
