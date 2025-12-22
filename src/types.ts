export interface Character {
  family_names: string;
  given_names: string;
  category: string;
  difficulty: string;
  image_url: string;
  hints: string[];
}

export interface GameConfig {
  googleSheetUrl: string;
  numberOfRounds: number;
  freeTurnDuration: number; // duration in seconds for free-turn phase
  turnDurations: number[]; // duration in seconds for each turn (1st turn, 2nd turn, etc.)
  teamNames: string[];
  selectedDifficulties: string[];
  selectedCategories: string[];
  scoringSystem: {
    freeTurn: number;
    turnScores: number[]; // score for each turn (1st turn, 2nd turn, etc.)
  };
  characterSelectionMode: 'random' | 'increasing';
}

export interface GameState {
  config: GameConfig;
  characters: Character[];
  usedCharacters: Set<string>;
  currentRound: number;
  currentCategory: string | null;
  currentCharacter: Character | null;
  scores: Record<string, number>;
  gameHistory: RoundResult[];
  isGameActive: boolean;
  isTimerRunning: boolean;
  timeRemaining: number;
  hintsRevealed: number;
}

export interface RoundResult {
  round: number;
  category: string;
  character: Character;
  scores: Record<string, number>;
  hintsUsed: number;
}

export interface CategoryInfo {
  name: string;
  remainingCharacters: number;
  totalCharacters: number;
}
