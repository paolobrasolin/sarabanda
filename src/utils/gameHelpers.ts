import type { Character, GameStatus } from '../types';

/**
 * Helper functions for game state operations
 * These work with GameStatus and don't depend on React hooks
 */

export function getAvailableCharacters(state: GameStatus): Character[] {
  return state.characters.filter((char) => {
    const id = createCharacterId(char);
    return (
      !state.usedCharacters.includes(id) &&
      state.config.selectedDifficulties.includes(char.difficulty) &&
      state.config.selectedCategories.includes(char.category)
    );
  });
}

export function getCategories(state: GameStatus) {
  const availableChars = getAvailableCharacters(state);
  const categoryMap = new Map<string, { remainingCharacters: number; totalCharacters: number }>();

  // Count remaining characters
  availableChars.forEach((char) => {
    const existing = categoryMap.get(char.category) || { remainingCharacters: 0, totalCharacters: 0 };
    categoryMap.set(char.category, {
      remainingCharacters: existing.remainingCharacters + 1,
      totalCharacters: existing.totalCharacters + 1,
    });
  });

  // Count total characters (including used ones)
  state.characters.forEach((char) => {
    if (
      state.config.selectedDifficulties.includes(char.difficulty) &&
      state.config.selectedCategories.includes(char.category)
    ) {
      const existing = categoryMap.get(char.category) || { remainingCharacters: 0, totalCharacters: 0 };
      categoryMap.set(char.category, {
        remainingCharacters: existing.remainingCharacters,
        totalCharacters: existing.totalCharacters + 1,
      });
    }
  });

  return Array.from(categoryMap.entries()).map(([name, counts]) => ({
    name,
    ...counts,
  }));
}

export function getCharacterById(state: GameStatus, id: string): Character | undefined {
  return state.characters.find((char) => createCharacterId(char) === id);
}

export function isCharacterUsed(state: GameStatus, character: Character): boolean {
  const id = createCharacterId(character);
  return state.usedCharacters.includes(id);
}

// Helper function to create character ID for tracking
export function createCharacterId(character: Character): string {
  return `${character.family_names}_${character.given_names}_${character.category}`.toLowerCase().replace(/\s+/g, '_');
}
