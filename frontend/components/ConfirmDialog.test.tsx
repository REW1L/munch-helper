import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConfirmDialog from '@/components/ConfirmDialog';

vi.mock('react-native', async (importOriginal) => {
  const ReactModule = await import('react');
  const actual = await importOriginal<typeof import('react-native')>();

  return {
    ...actual,
    Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) => (
      visible ? ReactModule.createElement('div', { 'data-testid': 'viewport-modal' }, children) : null
    ),
    Platform: { ...actual.Platform, OS: 'ios' },
  };
});

describe('ConfirmDialog', () => {
  it('presents the custom iOS dialog in a viewport-level modal', () => {
    render(
      <ConfirmDialog
        cancelLabel="Keep battle"
        confirmLabel="Discard"
        message="Discard this battle?"
        title="Discard battle?"
        visible
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId('viewport-modal')).toBeTruthy();
    expect(screen.getByText('Discard battle?')).toBeTruthy();
  });
});
