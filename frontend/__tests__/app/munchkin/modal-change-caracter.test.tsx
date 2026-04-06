import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import ChangeCharacterModal from '../../../app/munchkin/modal-change-caracter';

vi.mock('expo-image', () => ({
  Image: 'Image',
}));

vi.mock('@/constants/avatars', () => ({
  default: Array.from({ length: 10 }, () => 1),
}));

vi.mock('@/components/munchkin/NativePicker', () => ({
  default: () => null,
}));

vi.mock('reanimated-color-picker', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => children,
  Panel5: () => null,
}));

vi.mock('react-native', async () => {
  const actual = await vi.importActual<typeof import('react-native')>('react-native');
  return {
    ...actual,
    Modal: ({ children }: { children?: React.ReactNode }) => children,
  };
});

/** Find a TouchableOpacity whose direct Text child matches the given label. */
function findButtonByLabel(renderer: ReturnType<typeof TestRenderer.create>, label: string) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find((btn: any) =>
      btn.findAllByType(Text).some((t: any) => t.props.children === label)
    );
}

/** Find the ConfirmDialog confirm button by testID. */
function findConfirmButton(renderer: ReturnType<typeof TestRenderer.create>) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find((btn: any) => btn.props.testID === 'confirm-dialog-confirm');
}

describe('ChangeCharacterModal', () => {
  it('resets its local draft when the selected character changes mid-session', async () => {
    const firstCharacter = {
      id: 'char-first',
      nickname: 'Rogue',
      color: '#0088CC',
      gender: ['female'],
      race: ['Elf'],
      class: ['Thief'],
      level: 4,
      power: 1,
      avatar: 2,
    };
    const secondCharacter = {
      id: 'char-second',
      nickname: 'Mage',
      color: '#BB44DD',
      gender: ['female'],
      race: ['Human'],
      class: ['Wizard'],
      level: 5,
      power: 6,
      avatar: 3,
    };

    let renderer: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <ChangeCharacterModal
          character={firstCharacter}
          deleteError={null}
          onConfirm={vi.fn()}
          onDelete={vi.fn(async () => undefined)}
          onCancel={vi.fn()}
        />
      );
    });

    const nameInput = renderer!.root.findAllByType(TextInput)[0];

    await act(async () => {
      nameInput.props.onChangeText('Edited Rogue');
    });

    expect(renderer!.root.findAllByType(TextInput)[0].props.value).toBe('Edited Rogue');

    await act(async () => {
      renderer!.update(
        <ChangeCharacterModal
          character={secondCharacter}
          deleteError={null}
          onConfirm={vi.fn()}
          onDelete={vi.fn(async () => undefined)}
          onCancel={vi.fn()}
        />
      );
    });

    expect(renderer!.root.findAllByType(TextInput)[0].props.value).toBe('Mage');
  });

  it('keeps delete pending state scoped to the active character during overlapping deletes', async () => {
    const firstCharacter = {
      id: 'char-first',
      nickname: 'Rogue',
      color: '#0088CC',
      gender: ['female'],
      race: ['Elf'],
      class: ['Thief'],
      level: 4,
      power: 1,
      avatar: 2,
    };
    const secondCharacter = {
      id: 'char-second',
      nickname: 'Mage',
      color: '#BB44DD',
      gender: ['female'],
      race: ['Human'],
      class: ['Wizard'],
      level: 5,
      power: 6,
      avatar: 3,
    };

    let resolveFirstDelete!: () => void;
    let resolveSecondDelete!: () => void;
    const onDelete = vi
      .fn<(characterId: string) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstDelete = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecondDelete = resolve;
          })
      );

    let renderer: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <ChangeCharacterModal
          character={firstCharacter}
          deleteError={null}
          onConfirm={vi.fn()}
          onDelete={onDelete}
          onCancel={vi.fn()}
        />
      );
    });

    const pressDeleteAndConfirm = async () => {
      const deleteButton = findButtonByLabel(renderer!, 'Delete');
      expect(deleteButton).toBeTruthy();

      await act(async () => {
        deleteButton!.props.onPress();
      });

      // ConfirmDialog is now visible — find the confirm button by testID
      const confirmButton = findConfirmButton(renderer!);
      expect(confirmButton).toBeTruthy();

      await act(async () => {
        confirmButton!.props.onPress();
        await Promise.resolve();
      });
    };

    await pressDeleteAndConfirm();
    expect(onDelete).toHaveBeenCalledWith('char-first');

    await act(async () => {
      renderer!.update(
        <ChangeCharacterModal
          character={secondCharacter}
          deleteError={null}
          onConfirm={vi.fn()}
          onDelete={onDelete}
          onCancel={vi.fn()}
        />
      );
    });

    await pressDeleteAndConfirm();
    expect(onDelete).toHaveBeenCalledWith('char-second');

    await act(async () => {
      resolveFirstDelete();
      await Promise.resolve();
    });

    const deletingLabelStillVisible = renderer!.root
      .findAllByType(Text)
      .some((textNode: any) => textNode.props.children === 'Deleting...');
    expect(deletingLabelStillVisible).toBe(true);

    await act(async () => {
      resolveSecondDelete();
      await Promise.resolve();
    });

    const deleteLabelVisible = renderer!.root
      .findAllByType(Text)
      .some((textNode: any) => textNode.props.children === 'Delete');
    expect(deleteLabelVisible).toBe(true);
  });

  it('keeps cancel disabled while delete is in flight', async () => {
    const character = {
      id: 'char-first',
      nickname: 'Rogue',
      color: '#0088CC',
      gender: ['female'],
      race: ['Elf'],
      class: ['Thief'],
      level: 4,
      power: 1,
      avatar: 2,
    };

    let resolveDelete!: () => void;
    const onDelete = vi.fn<(characterId: string) => Promise<void>>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );
    const onCancel = vi.fn();

    let renderer: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <ChangeCharacterModal
          character={character}
          deleteError={null}
          onConfirm={vi.fn()}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      );
    });

    await act(async () => {
      findButtonByLabel(renderer!, 'Delete')!.props.onPress();
    });

    // Confirm via ConfirmDialog
    await act(async () => {
      findConfirmButton(renderer!)!.props.onPress();
    });
    await act(async () => { await Promise.resolve(); });

    const cancelButton = findButtonByLabel(renderer!, 'Cancel');
    expect(cancelButton?.props.disabled).toBe(true);

    await act(async () => {
      cancelButton!.props.onPress();
    });
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });

    expect(findButtonByLabel(renderer!, 'Cancel')?.props.disabled).toBe(false);
  });

  it('keeps save disabled while delete is in flight', async () => {
    const character = {
      id: 'char-first',
      nickname: 'Rogue',
      color: '#0088CC',
      gender: ['female'],
      race: ['Elf'],
      class: ['Thief'],
      level: 4,
      power: 1,
      avatar: 2,
    };

    let resolveDelete!: () => void;
    const onDelete = vi.fn<(characterId: string) => Promise<void>>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );
    const onConfirm = vi.fn();

    let renderer: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      renderer = TestRenderer.create(
        <ChangeCharacterModal
          character={character}
          deleteError={null}
          onConfirm={onConfirm}
          onDelete={onDelete}
          onCancel={vi.fn()}
        />
      );
    });

    await act(async () => {
      findButtonByLabel(renderer!, 'Delete')!.props.onPress();
    });

    // Confirm via ConfirmDialog
    await act(async () => {
      findConfirmButton(renderer!)!.props.onPress();
    });
    await act(async () => { await Promise.resolve(); });

    const saveButton = findButtonByLabel(renderer!, 'Save');
    expect(saveButton?.props.disabled).toBe(true);

    await act(async () => {
      saveButton!.props.onPress();
    });
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });

    expect(findButtonByLabel(renderer!, 'Save')?.props.disabled).toBe(false);
  });
});
