import { useEffect, useState } from 'react';
import type { Character, GameState } from '../types';
import { createCharacterId, loadGameState } from '../utils/storage';

/**
 * Read-only hook for PlayerScreen that listens to localStorage changes
 * via storage events. This allows the PlayerScreen to stay in sync
 * with RemoteScreen updates without needing React Context.
 */
export function useGameState() {
  const [state, setState] = useState<GameState | null>(() => {
    // Load initial state from localStorage
    return loadGameState();
  });

  useEffect(() => {
    // Listen to storage events (fired when other tabs modify localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sarabanda_status' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue) as GameState;

          // Convert usedCharacters Set back from array
          if (newState.usedCharacters && Array.isArray(newState.usedCharacters)) {
            newState.usedCharacters = new Set(newState.usedCharacters);
          }

          setState(newState);
        } catch (error) {
          console.error('Failed to parse game state from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll localStorage periodically as a fallback
    // (storage events don't fire in the same tab, but this is mainly for same-tab scenarios)
    // Note: In normal usage, RemoteScreen and PlayerScreen are in different tabs,
    // so storage events should handle updates. Polling is a safety net.
    const pollInterval = setInterval(() => {
      const currentState = loadGameState();
      if (currentState) {
        setState((prev) => {
          // Only update if state actually changed (avoid unnecessary re-renders)
          // Compare key fields that are likely to change
          if (!prev) return currentState;

          const prevKey = `${prev.isGameActive}-${prev.currentRound}-${prev.timeRemaining}-${prev.usedCharacters.size}`;
          const currKey = `${currentState.isGameActive}-${currentState.currentRound}-${currentState.timeRemaining}-${currentState.usedCharacters.size}`;

          if (prevKey !== currKey) {
            return currentState;
          }
          return prev;
        });
      }
    }, 1000); // Poll every 1 second (less frequent, storage events are primary mechanism)

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Helper functions (read-only versions)
  const getAvailableCharacters = (): Character[] => {
    if (!state) return [];

    return state.characters.filter((char) => {
      const id = createCharacterId(char);
      return (
        !state.usedCharacters.has(id) &&
        state.config.selectedDifficulties.includes(char.difficulty) &&
        state.config.selectedCategories.includes(char.category)
      );
    });
  };

  const getCategories = () => {
    if (!state) return [];

    const availableChars = getAvailableCharacters();
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
  };

  const getCharacterById = (id: string): Character | undefined => {
    if (!state) return undefined;
    return state.characters.find((char) => createCharacterId(char) === id);
  };

  const isCharacterUsed = (character: Character): boolean => {
    if (!state) return false;
    const id = createCharacterId(character);
    return state.usedCharacters.has(id);
  };

  return {
    state,
    getAvailableCharacters,
    getCategories,
    getCharacterById,
    isCharacterUsed,
  };
}
