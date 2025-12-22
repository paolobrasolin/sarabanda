import type { Character, GameConfig, GameState } from '../types';

const STORAGE_KEYS = {
  GAME_STATE: 'sarafaccia_game_state',
  USED_CHARACTERS: 'sarafaccia_used_characters',
  GAME_CONFIG: 'sarafaccia_game_config',
} as const;

export function saveGameState(gameState: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(gameState));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

export function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // Convert usedCharacters Set back from array
    if (parsed.usedCharacters && Array.isArray(parsed.usedCharacters)) {
      parsed.usedCharacters = new Set(parsed.usedCharacters);
    }

    return parsed as GameState;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

export function saveUsedCharacters(usedCharacters: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USED_CHARACTERS, JSON.stringify([...usedCharacters]));
  } catch (error) {
    console.error('Failed to save used characters:', error);
  }
}

export function loadUsedCharacters(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USED_CHARACTERS);
    if (!saved) return new Set();

    const parsed = JSON.parse(saved);
    return new Set(parsed);
  } catch (error) {
    console.error('Failed to load used characters:', error);
    return new Set();
  }
}

export function saveGameConfig(config: GameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save game config:', error);
  }
}

export function loadGameConfig(): GameConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_CONFIG);
    if (!saved) return null;

    return JSON.parse(saved) as GameConfig;
  } catch (error) {
    console.error('Failed to load game config:', error);
    return null;
  }
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    localStorage.removeItem(STORAGE_KEYS.USED_CHARACTERS);
    localStorage.removeItem(STORAGE_KEYS.GAME_CONFIG);
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

// Helper function to create character ID for tracking
export function createCharacterId(character: Character): string {
  return `${character.family_names}_${character.given_names}_${character.category}`.toLowerCase().replace(/\s+/g, '_');
}
