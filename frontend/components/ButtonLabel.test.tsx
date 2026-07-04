import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ButtonLabel from '@/components/ButtonLabel';

// Capture the props ButtonLabel forwards to the underlying Text. The runtime
// (react-native-web) drops RN-only props like adjustsFontSizeToFit, so we spy
// on Text directly to assert the single-line shrink-to-fit policy is applied.
// vi.mock is hoisted above imports, so react-native resolves to this spy.
const textProps: Record<string, unknown>[] = [];
vi.mock('react-native', () => ({
  Text: (props: Record<string, unknown>) => {
    textProps.push(props);
    return React.createElement(
      'span',
      { 'data-testid': props.testID as string | undefined },
      props.children as React.ReactNode
    );
  },
}));

describe('ButtonLabel', () => {
  it('applies the single-line shrink-to-fit policy', () => {
    render(<ButtonLabel>Save</ButtonLabel>);
    const props = textProps.at(-1)!;
    expect(props.numberOfLines).toBe(1);
    expect(props.adjustsFontSizeToFit).toBe(true);
    expect(props.minimumFontScale).toBe(0.75);
  });

  it('passes through children, style, and testID', () => {
    const style = { fontSize: 22 };
    render(
      <ButtonLabel style={style} testID="my-label">
        Speichern
      </ButtonLabel>
    );
    const props = textProps.at(-1)!;
    expect(props.style).toBe(style);
    expect(props.testID).toBe('my-label');
    expect(props.children).toBe('Speichern');
    expect(screen.getByTestId('my-label')).toBeDefined();
  });
});
