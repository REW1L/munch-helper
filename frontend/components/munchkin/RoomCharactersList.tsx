import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import React, { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import RoomCharacterCard from './RoomCharacterCard';

interface RoomCharactersListProps {
  characters: RoomCharacter[];
  isLoading: boolean;
  errorMessage: string | null;
  actionError: string | null;
  onCreateCharacter: () => void;
  onChangePress: (character: RoomCharacter) => void;
}

const RoomCharactersList = memo(function RoomCharactersList({
  characters,
  isLoading,
  errorMessage,
  actionError,
  onCreateCharacter,
  onChangePress,
}: RoomCharactersListProps) {
  const listHeader = useMemo(() => {
    if (!actionError) {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{actionError}</Text>
      </View>
    );
  }, [actionError]);

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading characters...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{errorMessage}</Text>
        </View>
      );
    }

    return null;
  }, [errorMessage, isLoading]);

  return (
    <FlatList
      data={characters}
      renderItem={({ item }) => <RoomCharacterCard character={item} onChangePress={onChangePress} />}
      keyExtractor={(item) => item.id}
      style={styles.mainContent}
      contentContainerStyle={styles.mainContentContainer}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.characterSeparator} />}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={
        <View style={styles.createCharacterButtonContainer}>
          <VioletButton title="Create a character" onPress={onCreateCharacter} />
        </View>
      }
      removeClippedSubviews
    />
  );
});

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    backgroundColor: '#3C3636',
    paddingHorizontal: 5,
  },
  mainContentContainer: {
    paddingVertical: 10,
  },
  characterSeparator: {
    height: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  createCharacterButtonContainer: {
    padding: 10,
    alignItems: 'center',
  },
});

export default RoomCharactersList;
