import type { Character, GameCharacter, GameConfig, GamePhase, GameStatus, RoundResult } from '../types';
import { createCharacterId } from './gameHelpers';

/**
 * State update helpers - pure functions that return new state
 * These replace the reducer pattern for direct state updates
 */

export function updateConfig(state: GameStatus, config: GameConfig): GameStatus {
  return { ...state, config };
}

export function updateCharacters(state: GameStatus, characters: Character[]): GameStatus {
  return { ...state, characters };
}

export function startGame(state: GameStatus): GameStatus {
  // Can only start game from 'ready' phase
  if (state.phase !== 'ready') {
    return state;
  }

  const initialScores = state.config.teamNames.reduce(
    (acc, team) => {
      acc[team] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );
  return {
    ...state,
    isGameActive: true,
    currentRound: 1,
    scores: initialScores,
    gameHistory: [],
    hintsRevealed: 0,
  };
}

export function endGame(state: GameStatus): GameStatus {
  return {
    ...state,
    isGameActive: false,
    isTimerRunning: false,
    currentCharacter: null,
    currentCategory: null,
  };
}

export function setCurrentRound(state: GameStatus, round: number): GameStatus {
  return { ...state, currentRound: round };
}

export function setCurrentCategory(state: GameStatus, category: string | null): GameStatus {
  return { ...state, currentCategory: category };
}

export function setCurrentCharacter(state: GameStatus, character: Character | null): GameStatus {
  return { ...state, currentCharacter: character };
}

export function updateScores(state: GameStatus, scores: Record<string, number>): GameStatus {
  return { ...state, scores: { ...state.scores, ...scores } };
}

export function addRoundResult(state: GameStatus, result: RoundResult): GameStatus {
  return {
    ...state,
    gameHistory: [...state.gameHistory, result],
  };
}

export function markCharacterUsed(state: GameStatus, characterId: string): GameStatus {
  // Only add if not already in the array
  if (!state.usedCharacters.includes(characterId)) {
    return { ...state, usedCharacters: [...state.usedCharacters, characterId] };
  }
  return state;
}

export function setTimerRunning(state: GameStatus, running: boolean): GameStatus {
  return { ...state, isTimerRunning: running };
}

export function setTimeRemaining(state: GameStatus, time: number): GameStatus {
  return { ...state, timeRemaining: time };
}

export function setHintsRevealed(state: GameStatus, hints: number): GameStatus {
  return { ...state, hintsRevealed: hints };
}

export function setPhase(state: GameStatus, phase: GamePhase): GameStatus {
  return { ...state, phase };
}

/**
 * Generates the list of characters for all rounds based on the current configuration.
 * Filters characters by selected difficulties and categories, then randomly selects
 * one character per round.
 */
export function generateGameCharacters(state: GameStatus): GameCharacter[] {
  const { config, characters } = state;
  const { numberOfRounds, selectedDifficulties, selectedCategories } = config;

  // Filter characters based on selected criteria
  const availableCharacters = characters.filter(
    (char) =>
      selectedDifficulties.includes(char.difficulty) && selectedCategories.includes(char.category),
  );

  if (availableCharacters.length === 0) {
    return [];
  }

  // If we have fewer characters than rounds, we'll reuse some
  // Otherwise, randomly select one character per round
  const selected: GameCharacter[] = [];
  const usedIndices = new Set<number>();

  for (let round = 1; round <= numberOfRounds; round++) {
    // Find available indices (not already used, or reuse if we've exhausted all)
    let attempts = 0;
    let charIndex: number;

    do {
      if (usedIndices.size >= availableCharacters.length) {
        // Reset if we've used all characters
        usedIndices.clear();
      }
      charIndex = Math.floor(Math.random() * availableCharacters.length);
      attempts++;
    } while (usedIndices.has(charIndex) && attempts < 100);

    usedIndices.add(charIndex);
    const character = availableCharacters[charIndex];
    selected.push({
      character,
      round,
      category: character.category,
    });
  }

  return selected;
}

/**
 * Transitions from setup to ready phase by generating the game characters.
 * This freezes the configuration and prepares the game for start.
 */
export function transitionToReady(state: GameStatus): GameStatus {
  if (state.phase !== 'setup') {
    return state; // Can only transition from setup
  }

  // Validate that we have characters loaded
  if (state.characters.length === 0) {
    return state; // Cannot transition without characters
  }

  // Validate that we have selected difficulties and categories
  if (
    state.config.selectedDifficulties.length === 0 ||
    state.config.selectedCategories.length === 0
  ) {
    return state; // Cannot transition without selections
  }

  const gameCharacters = generateGameCharacters(state);

  if (gameCharacters.length === 0) {
    return state; // Cannot transition if no characters match criteria
  }

  return {
    ...state,
    phase: 'ready',
    gameCharacters,
  };
}

/**
 * Transitions back from ready to setup phase, clearing game characters.
 * This allows reconfiguration of the game.
 */
export function transitionToSetup(state: GameStatus): GameStatus {
  return {
    ...state,
    phase: 'setup',
    gameCharacters: [],
    usedCharacters: [],
    currentRound: 0,
    currentCategory: null,
    currentCharacter: null,
    scores: {},
    gameHistory: [],
    isGameActive: false,
    isTimerRunning: false,
    timeRemaining: 0,
    hintsRevealed: 0,
  };
}
