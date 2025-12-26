import type { GameConfig, GameStatus } from '../types';

export const initialGameConfig: GameConfig = {
  googleSheetUrl: '',
  numberOfRounds: 10,
  freeTurnDuration: 30,
  nthTurnDurations: [60, 60], // one duration per team
  teamNames: ['Team A', 'Team B'],
  selectedDifficulties: [],
  selectedCategories: [],
  freeTurnScore: 0.5,
  nthTurnScores: [2, 1],
};

export const initialGameStatus: GameStatus = {
  phase: 'prepping',
  config: initialGameConfig,
  characters: [],
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
  currentTurn: 0,
  currentTeamIndex: null,
  turnType: 'team',
};
