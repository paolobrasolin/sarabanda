import type { Character, GameConfig, GamePhase, GameStatus, RoundResult } from '../types';
import { createCharacterId, getAvailableCharacters } from './gameHelpers';

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

/**
 * Rolls a random character for the current round from available characters.
 * Returns null if no characters are available.
 */
export function rollCharacterForRound(state: GameStatus): Character | null {
  const availableCharacters = getAvailableCharacters(state);
  
  if (availableCharacters.length === 0) {
    return null;
  }

  // Randomly select a character
  const randomIndex = Math.floor(Math.random() * availableCharacters.length);
  return availableCharacters[randomIndex];
}

/**
 * Transitions to choosing phase and rolls a character for the current round.
 * Can be called from 'prepping' (to start the game) or from 'guessing' (to move to next round).
 */
export function transitionToChoosing(state: GameStatus): GameStatus {
  // Validate that we have characters loaded
  if (state.characters.length === 0) {
    return state;
  }

  // Validate that we have selected difficulties and categories
  if (
    state.config.selectedDifficulties.length === 0 ||
    state.config.selectedCategories.length === 0
  ) {
    return state;
  }

  // If starting from prepping, initialize game state
  let newState = state;
  if (state.phase === 'prepping') {
    const initialScores = state.config.teamNames.reduce(
      (acc, team) => {
        acc[team] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );
    newState = {
      ...state,
      isGameActive: true,
      currentRound: 1,
      scores: initialScores,
      gameHistory: [],
      hintsRevealed: 0,
    };
  } else if (state.phase === 'guessing') {
    // Moving to next round - increment round number
    newState = {
      ...state,
      currentRound: state.currentRound + 1,
    };
  }

  // Roll a character for this round
  const rolledCharacter = rollCharacterForRound(newState);
  if (!rolledCharacter) {
    return state; // Cannot transition if no characters available
  }

  return {
    ...newState,
    phase: 'choosing',
    currentCharacter: rolledCharacter,
    currentCategory: rolledCharacter.category,
  };
}

/**
 * Transitions from choosing to guessing phase, confirming the current character.
 * This makes the character visible to players.
 */
export function transitionToGuessing(state: GameStatus): GameStatus {
  if (state.phase !== 'choosing' || !state.currentCharacter) {
    return state;
  }

  return {
    ...state,
    phase: 'guessing',
  };
}

/**
 * Re-rolls the character for the current round.
 * Only works in 'choosing' phase.
 */
export function rerollCharacter(state: GameStatus): GameStatus {
  if (state.phase !== 'choosing') {
    return state;
  }

  const rolledCharacter = rollCharacterForRound(state);
  if (!rolledCharacter) {
    return state; // Cannot re-roll if no characters available
  }

  return {
    ...state,
    currentCharacter: rolledCharacter,
    currentCategory: rolledCharacter.category,
  };
}

/**
 * Starts the game from prepping phase.
 * This is a convenience function that transitions to choosing and rolls the first character.
 */
export function startGame(state: GameStatus): GameStatus {
  if (state.phase !== 'prepping') {
    return state;
  }

  return transitionToChoosing(state);
}

export function endGame(state: GameStatus): GameStatus {
  return {
    ...state,
    phase: 'prepping',
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
 * Transitions back to prepping phase, clearing all game state.
 * This allows reconfiguration of the game.
 */
export function transitionToPrepping(state: GameStatus): GameStatus {
  return {
    ...state,
    phase: 'prepping',
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
