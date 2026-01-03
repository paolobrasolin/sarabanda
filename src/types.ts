export interface Character {
  props: Record<string, string>; // Dynamic properties from columns named "prop.*"
  tags: Record<string, string[]>; // Dynamic tags from columns named "tags.*" - each tag can have multiple comma-separated values
  image_url: string;
}

export interface GameConfig {
  googleSheetUrl: string;
  numberOfRounds: number;
  freeTurnDuration: number; // duration in seconds for free-turn phase
  nthTurnDurations: number[]; // duration in seconds for each turn (1st turn, 2nd turn, etc.)
  teamNames: string[];
  selectedTags: Record<string, string[]>; // Dynamic tag filters: key is tag name (e.g., "category", "difficulty"), value is array of selected values
  freeTurnScore: number;
  nthTurnScores: number[]; // score for each turn (1st turn, 2nd turn, etc.)
}

export type GamePhase = 'prepping' | 'choosing' | 'guessing' | 'stopping';

export interface GameCharacter {
  character: Character;
  round: number;
  category: string;
}

export interface GameStatus {
  phase: GamePhase;
  config: GameConfig;
  characters: Character[];
  usedCharacters: string[];
  currentRound: number;
  currentCategory: string | null;
  currentCharacter: Character | null;
  scores: Record<string, number>;
  gameHistory: RoundResult[];
  isGameActive: boolean;
  isTimerRunning: boolean;
  timeRemaining: number;
  timerEndsAt: number | null; // Timestamp (ms) when timer will end, null if timer is off
  hintsRevealed: number;
  currentTurn: number;
  currentTeamIndex: number | null;
  turnType: 'team' | 'free-for-all';
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
