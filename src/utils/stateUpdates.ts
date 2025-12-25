import type { Character, GameConfig, GameState, RoundResult } from '../types';

/**
 * State update helpers - pure functions that return new state
 * These replace the reducer pattern for direct state updates
 */

export function updateConfig(state: GameState, config: GameConfig): GameState {
  return { ...state, config };
}

export function updateCharacters(state: GameState, characters: Character[]): GameState {
  return { ...state, characters };
}

export function startGame(state: GameState): GameState {
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

export function endGame(state: GameState): GameState {
  return {
    ...state,
    isGameActive: false,
    isTimerRunning: false,
    currentCharacter: null,
    currentCategory: null,
  };
}

export function setCurrentRound(state: GameState, round: number): GameState {
  return { ...state, currentRound: round };
}

export function setCurrentCategory(state: GameState, category: string | null): GameState {
  return { ...state, currentCategory: category };
}

export function setCurrentCharacter(state: GameState, character: Character | null): GameState {
  return { ...state, currentCharacter: character };
}

export function updateScores(state: GameState, scores: Record<string, number>): GameState {
  return { ...state, scores: { ...state.scores, ...scores } };
}

export function addRoundResult(state: GameState, result: RoundResult): GameState {
  return {
    ...state,
    gameHistory: [...state.gameHistory, result],
  };
}

export function markCharacterUsed(state: GameState, characterId: string): GameState {
  // Only add if not already in the array
  if (!state.usedCharacters.includes(characterId)) {
    return { ...state, usedCharacters: [...state.usedCharacters, characterId] };
  }
  return state;
}

export function setTimerRunning(state: GameState, running: boolean): GameState {
  return { ...state, isTimerRunning: running };
}

export function setTimeRemaining(state: GameState, time: number): GameState {
  return { ...state, timeRemaining: time };
}

export function setHintsRevealed(state: GameState, hints: number): GameState {
  return { ...state, hintsRevealed: hints };
}
