import type { Character, GameConfig, GameStatus, RoundResult } from '../types';

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
