import type React from 'react';
import { createContext, type ReactNode, useContext, useEffect, useReducer } from 'react';
import type { Character, GameConfig, GameState, RoundResult } from '../types';
import {
  createCharacterId,
  loadGameState,
  loadPeople,
  loadUsedCharacters,
  saveGameState,
  saveUsedCharacters,
} from '../utils/storage';

type GameAction =
  | { type: 'SET_CONFIG'; payload: GameConfig }
  | { type: 'SET_CHARACTERS'; payload: Character[] }
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'SET_CURRENT_CATEGORY'; payload: string | null }
  | { type: 'SET_CURRENT_CHARACTER'; payload: Character | null }
  | { type: 'UPDATE_SCORES'; payload: Record<string, number> }
  | { type: 'ADD_ROUND_RESULT'; payload: RoundResult }
  | { type: 'MARK_CHARACTER_USED'; payload: string }
  | { type: 'SET_TIMER_RUNNING'; payload: boolean }
  | { type: 'SET_TIME_REMAINING'; payload: number }
  | { type: 'SET_HINTS_REVEALED'; payload: number }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_STATE'; payload: GameState };

const initialState: GameState = {
  config: {
    googleSheetUrl: '',
    numberOfRounds: 10,
    freeTurnDuration: 30,
    nthTurnDurations: [60, 60], // one duration per team
    teamNames: ['Team A', 'Team B'],
    selectedDifficulties: [],
    selectedCategories: [],
    freeTurnScore: 0.5,
    nthTurnScores: [2, 1],
  },
  characters: [],
  usedCharacters: new Set(),
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

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload };

    case 'SET_CHARACTERS':
      return { ...state, characters: action.payload };

    case 'START_GAME': {
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

    case 'END_GAME':
      return {
        ...state,
        isGameActive: false,
        isTimerRunning: false,
        currentCharacter: null,
        currentCategory: null,
      };

    case 'SET_CURRENT_ROUND':
      return { ...state, currentRound: action.payload };

    case 'SET_CURRENT_CATEGORY':
      return { ...state, currentCategory: action.payload };

    case 'SET_CURRENT_CHARACTER':
      return { ...state, currentCharacter: action.payload };

    case 'UPDATE_SCORES':
      return { ...state, scores: { ...state.scores, ...action.payload } };

    case 'ADD_ROUND_RESULT':
      return {
        ...state,
        gameHistory: [...state.gameHistory, action.payload],
      };

    case 'MARK_CHARACTER_USED': {
      const newUsedCharacters = new Set(state.usedCharacters);
      newUsedCharacters.add(action.payload);
      return { ...state, usedCharacters: newUsedCharacters };
    }

    case 'SET_TIMER_RUNNING':
      return { ...state, isTimerRunning: action.payload };

    case 'SET_TIME_REMAINING':
      return { ...state, timeRemaining: action.payload };

    case 'SET_HINTS_REVEALED':
      return { ...state, hintsRevealed: action.payload };

    case 'RESET_GAME':
      return {
        ...initialState,
        config: state.config,
        characters: state.characters,
        usedCharacters: state.usedCharacters,
      };

    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  // Helper functions
  getAvailableCharacters: () => Character[];
  getCategories: () => Array<{ name: string; remainingCharacters: number; totalCharacters: number }>;
  getCharacterById: (id: string) => Character | undefined;
  isCharacterUsed: (character: Character) => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadGameState();
    const savedUsedCharacters = loadUsedCharacters();
    const savedPeople = loadPeople();

    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
      // If saved state doesn't have characters but we have saved people, load them
      if (savedState.characters.length === 0 && savedPeople && savedPeople.length > 0) {
        dispatch({ type: 'SET_CHARACTERS', payload: savedPeople });
      }
    } else {
      // If no saved state, try to load characters from separate storage
      if (savedPeople && savedPeople.length > 0) {
        dispatch({ type: 'SET_CHARACTERS', payload: savedPeople });
      }
    }

    if (savedUsedCharacters.size > 0) {
      // Load used characters - they'll be merged after state is loaded
      savedUsedCharacters.forEach((id) => {
        dispatch({ type: 'MARK_CHARACTER_USED', payload: id });
      });
    }
  }, []);

  // Load characters from separate storage if state doesn't have them
  useEffect(() => {
    if (state.characters.length === 0) {
      const savedPeople = loadPeople();
      if (savedPeople && savedPeople.length > 0) {
        dispatch({ type: 'SET_CHARACTERS', payload: savedPeople });
      }
    }
  }, [state.characters.length]);

  // Save state whenever it changes
  // Always save state so PlayerScreen can see it (for POC testing and normal operation)
  useEffect(() => {
    saveGameState(state);
  }, [state]);

  // Save used characters whenever they change
  useEffect(() => {
    if (state.usedCharacters.size > 0) {
      saveUsedCharacters(state.usedCharacters);
    }
  }, [state.usedCharacters]);

  const getAvailableCharacters = (): Character[] => {
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
    return state.characters.find((char) => createCharacterId(char) === id);
  };

  const isCharacterUsed = (character: Character): boolean => {
    const id = createCharacterId(character);
    return state.usedCharacters.has(id);
  };

  const contextValue: GameContextType = {
    state,
    dispatch,
    getAvailableCharacters,
    getCategories,
    getCharacterById,
    isCharacterUsed,
  };

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
