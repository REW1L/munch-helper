import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { View } from 'react-native';
import { RoomHeaderTitle } from './RoomHeaderTitle';

describe('RoomHeaderTitle', () => {
  it('keeps the code and Copy action available with a long localized room label', () => {
    const onCopyPress = vi.fn();
    render(
      <View style={{ width: 320 }}>
        <RoomHeaderTitle
          roomLabel="Zimmer für ein gemeinsames Munchkin-Spiel"
          roomCode="ROOM42"
          buttonLabel="Copy"
          accessibilityLabel="Copy room code ROOM42"
          editionLabel="Second Edition"
          onCopyPress={onCopyPress}
        />
      </View>,
    );

    expect(screen.getByText('ROOM42')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Copy room code ROOM42' }));
    expect(onCopyPress).toHaveBeenCalledOnce();
  });
});
