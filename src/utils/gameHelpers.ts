import type { Character, GameStatus } from '../types';

/**
 * Helper functions for game state operations
 * These work with GameStatus and don't depend on React hooks
 */

/**
 * Checks if a character matches all selected tag filters
 * For each tag, the character matches if ANY of its tag values match ANY of the selected values
 */
export function matchesTagFilters(char: Character, selectedTags: Record<string, string[]>): boolean {
  // For each tag filter, check if any of character's tag values match any of the selected values
  for (const [tagKey, selectedValues] of Object.entries(selectedTags)) {
    // If no values are selected for this tag, skip it (don't filter)
    if (selectedValues.length === 0) continue;
    
    const charTagValues = char.tags[tagKey] || [];
    // Check if any of the character's tag values match any of the selected values
    const hasMatch = charTagValues.some((charValue) => selectedValues.includes(charValue));
    if (!hasMatch) {
      return false; // Character doesn't match this tag filter
    }
  }
  return true; // Character matches all tag filters
}

export function getAvailableCharacters(state: GameStatus): Character[] {
  return state.characters.filter((char) => {
    const id = createCharacterId(char);
    return (
      !state.usedCharacters.includes(id) &&
      matchesTagFilters(char, state.config.selectedTags)
    );
  });
}

export function getCategories(state: GameStatus) {
  const availableChars = getAvailableCharacters(state);
  const categoryMap = new Map<string, { remainingCharacters: number; totalCharacters: number }>();

  // Count remaining characters
  availableChars.forEach((char) => {
    const categories = char.tags.category || [];
    categories.forEach((category) => {
      const existing = categoryMap.get(category) || { remainingCharacters: 0, totalCharacters: 0 };
      categoryMap.set(category, {
        remainingCharacters: existing.remainingCharacters + 1,
        totalCharacters: existing.totalCharacters + 1,
      });
    });
  });

  // Count total characters (including used ones) that match tag filters
  state.characters.forEach((char) => {
    if (matchesTagFilters(char, state.config.selectedTags)) {
      const categories = char.tags.category || [];
      categories.forEach((category) => {
        const existing = categoryMap.get(category) || { remainingCharacters: 0, totalCharacters: 0 };
        categoryMap.set(category, {
          remainingCharacters: existing.remainingCharacters,
          totalCharacters: existing.totalCharacters + 1,
        });
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

/**
 * Helper function to get all unique tag keys from an array of characters
 */
export function getTagKeys(characters: Character[]): string[] {
  const tagKeys = new Set<string>();
  characters.forEach((char) => {
    Object.keys(char.tags).forEach((key) => tagKeys.add(key));
  });
  return Array.from(tagKeys).sort();
}

/**
 * Helper function to get all unique values for a specific tag key from an array of characters
 * Handles tags that can have multiple values (arrays)
 */
export function getTagValues(characters: Character[], tagKey: string): string[] {
  const values = new Set<string>();
  characters.forEach((char) => {
    const tagValues = char.tags[tagKey] || [];
    tagValues.forEach((value) => {
      if (value) {
        values.add(value);
      }
    });
  });
  return Array.from(values).sort();
}

// Helper function to create character ID for tracking
// Uses all prop values and category tag to create a unique ID
export function createCharacterId(character: Character): string {
  // Sort prop keys to ensure consistent ordering
  const propKeys = Object.keys(character.props).sort();
  const propValues = propKeys.map((key) => character.props[key] || '').join('_');
  const categories = (character.tags.category || []).sort().join('_');
  return `${propValues}_${categories}`.toLowerCase().replace(/\s+/g, '_');
}
