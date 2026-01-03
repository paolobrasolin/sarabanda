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

/**
 * Converts a snake_case string to a display name (Title Case)
 * Example: "family_names" -> "Family Names"
 */
export function snakeCaseToDisplayName(snakeCase: string): string {
  return snakeCase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper function to get all unique prop keys from an array of characters
 */
export function getPropKeys(characters: Character[]): string[] {
  const propKeys = new Set<string>();
  characters.forEach((char) => {
    Object.keys(char.props).forEach((key) => propKeys.add(key));
  });
  return Array.from(propKeys).sort();
}

// Helper function to create character ID for tracking
// Uses all prop values to create a unique ID
export function createCharacterId(character: Character): string {
  // Sort prop keys to ensure consistent ordering
  const propKeys = Object.keys(character.props).sort();
  const propValues = propKeys.map((key) => character.props[key] || '').join('_');
  return `${propValues}_${character.category}`.toLowerCase().replace(/\s+/g, '_');
}
