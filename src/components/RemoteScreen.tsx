import { Button } from '@ariakit/react';
import { useEffect, useRef, useState } from 'react';
import { ConfigModal } from './ConfigDialog';
import { PeopleDialog } from './PeopleDialog';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import {
  endGame,
  setTimeRemaining,
  setTimerRunning,
  startGame,
  transitionToReady,
  transitionToSetup,
  updateCharacters,
} from '../utils/stateUpdates';
import { STORAGE_KEYS } from '../utils/storageKeys';

/**
 * RemoteScreen - Game Master control interface
 * This screen controls the game state and writes to localStorage.
 * PlayerScreen listens to these changes via storage events.
 */
function RemoteScreenContent() {
  const { value: state, update: updateState } = useStorage<GameStatus>(STORAGE_KEYS.STATUS);
  const { value: config } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);
  const { value: savedPeople } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);
  const timerIntervalRef = useRef<number | null>(null);
  const timeRemainingRef = useRef(state?.timeRemaining ?? 0);
  const stateRef = useRef(state);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);

  // Migrate old state format: ensure phase and gameCharacters exist
  useEffect(() => {
    if (state && (!('phase' in state) || !('gameCharacters' in state))) {
      const migratedState = {
        ...state,
        phase: (state as any).phase || 'setup',
        gameCharacters: (state as any).gameCharacters || [],
      };
      updateState(migratedState);
    }
  }, [state, updateState]);

  // Sync config from separate storage into state.config (for backward compatibility with state update functions)
  // This ensures state update functions that reference state.config continue to work
  useEffect(() => {
    if (state && config) {
      // Only update if config actually differs to avoid infinite loops
      const stateConfigString = JSON.stringify(state.config);
      const configString = JSON.stringify(config);
      if (stateConfigString !== configString) {
        updateState({ ...state, config });
      }
    }
  }, [state, config, updateState]);

  // Sync characters from PEOPLE storage to STATUS
  // Always keep STATUS.characters in sync with PEOPLE storage
  useEffect(() => {
    if (state && savedPeople) {
      // Check if characters need to be synced
      const stateCharsString = JSON.stringify(state.characters || []);
      const savedPeopleString = JSON.stringify(savedPeople);

      // Sync if PEOPLE has characters and they differ from STATUS
      if (savedPeople.length > 0 && stateCharsString !== savedPeopleString) {
        updateState(updateCharacters(state, savedPeople));
      } else if (savedPeople.length === 0 && state.characters.length > 0) {
        // Also sync if PEOPLE is empty but STATUS has characters (clear STATUS)
        updateState(updateCharacters(state, []));
      }
    }
  }, [state, savedPeople, updateState]);

  // Keep refs in sync with state
  useEffect(() => {
    if (state) {
      timeRemainingRef.current = state.timeRemaining;
      stateRef.current = state;
    }
  }, [state]);

  // Timer countdown effect
  useEffect(() => {
    if (!state) return;

    if (state.isTimerRunning && state.timeRemaining > 0) {
      // Clear any existing interval first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = window.setInterval(() => {
        const currentState = stateRef.current;
        if (!currentState) return;

        const newTime = timeRemainingRef.current - 1;
        if (newTime <= 0) {
          // Timer reached 0, stop it
          let newState = setTimerRunning(currentState, false);
          newState = setTimeRemaining(newState, 0);
          updateState(newState);
        } else {
          updateState(setTimeRemaining(currentState, newTime));
        }
      }, 1000);
    } else {
      // Stop timer if not running or time is 0
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (state.timeRemaining === 0 && state.isTimerRunning) {
        updateState(setTimerRunning(state, false));
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [state, updateState]);

  // Handle null state or config
  if (!state || !config) {
    return (
      <div className="remote-screen">
        <section className="remote-header">
          <h1>Game Master Control</h1>
          <p>Loading game state...</p>
        </section>
      </div>
    );
  }

  // Ensure phase is always set (fallback for migration)
  const currentPhase = state.phase || 'setup';

  const handlePrepareGame = () => {
    if (!config) {
      alert('Configuration not loaded. Please configure the game first.');
      return;
    }
    if (state.characters.length === 0) {
      alert('Please configure the game first by loading characters from a Google Sheet.');
      return;
    }
    if (config.selectedDifficulties.length === 0 || config.selectedCategories.length === 0) {
      alert('Please select at least one difficulty and one category in the configuration.');
      return;
    }

    // Merge config into state for the transition function
    const stateWithConfig = { ...state, config };

    // Debug: Check if any characters match the selected criteria
    const availableCharacters = stateWithConfig.characters.filter(
      (char) =>
        config.selectedDifficulties.includes(char.difficulty) && config.selectedCategories.includes(char.category),
    );

    if (availableCharacters.length === 0) {
      const availableDifficulties = [...new Set(state.characters.map((c) => c.difficulty))];
      const availableCategories = [...new Set(state.characters.map((c) => c.category))];
      alert(
        `No characters match the selected criteria.\n\n` +
        `Selected difficulties: ${config.selectedDifficulties.join(', ') || 'None'}\n` +
        `Selected categories: ${config.selectedCategories.join(', ') || 'None'}\n\n` +
        `Available difficulties: ${availableDifficulties.join(', ')}\n` +
        `Available categories: ${availableCategories.join(', ')}\n\n` +
        `Please adjust your selection in the Config screen.`,
      );
      return;
    }

    const newState = transitionToReady(stateWithConfig);
    if (newState.phase === 'setup') {
      alert('Failed to generate game characters. Please check your configuration and try again.');
      return;
    }
    updateState(newState);
  };

  const handleBackToSetup = () => {
    if (confirm('Are you sure you want to go back to setup? This will clear all game preparation.')) {
      updateState(transitionToSetup(state));
    }
  };

  const handleStartGame = () => {
    const currentPhase = state.phase || 'setup';
    if (currentPhase !== 'ready') {
      alert('Please prepare the game first.');
      return;
    }
    updateState(startGame(state));
  };

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the current game?')) {
      // Stop timer if running
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      let newState = endGame(state);
      newState = setTimerRunning(newState, false);
      newState = setTimeRemaining(newState, 0);
      updateState(newState);
    }
  };

  const handleStartStopTimer = () => {
    if (state.isTimerRunning) {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      updateState(setTimerRunning(state, false));
    } else {
      // Start timer
      let newState = state;
      if (state.timeRemaining === 0) {
        // Initialize timer to 30 seconds if at 0
        newState = setTimeRemaining(newState, 30);
      }
      updateState(setTimerRunning(newState, true));
    }
  };

  return (
    <div className="remote-screen">
      <section className="remote-controls">
        <div className="control-buttons">
          <button
            className="config-btn"
            onClick={() => setIsPeopleDialogOpen(true)}
            aria-label="Load characters"
            title="Load characters from Google Sheet"
          >
            People
          </button>
          <button
            className="config-btn"
            onClick={() => {
              console.log('Config button clicked, opening modal');
              setIsConfigModalOpen(true);
            }}
            aria-label="Open configuration"
            title="Open configuration"
          >
            Config
          </button>
          {currentPhase === 'setup' ? (
            <Button
              onClick={handlePrepareGame}
              className="control-btn control-btn-primary"
              disabled={state.characters.length === 0}
            >
              Prepare Game
            </Button>
          ) : currentPhase === 'ready' ? (
            <>
              <Button
                onClick={handleStartGame}
                className="control-btn control-btn-primary"
                disabled={state.gameCharacters.length === 0}
              >
                Start Game
              </Button>
              <Button onClick={handleBackToSetup} className="control-btn">
                Back to Setup
              </Button>
            </>
          ) : !state.isGameActive ? (
            <>
              <Button
                onClick={handleStartGame}
                className="control-btn control-btn-primary"
                disabled={state.characters.length === 0}
              >
                Start Game
              </Button>
              <Button
                onClick={handleStartStopTimer}
                className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
              >
                {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'} (POC Test)
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleEndGame} className="control-btn control-btn-danger">
                End Game
              </Button>
              <Button
                onClick={handleStartStopTimer}
                className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
              >
                {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'}
              </Button>
            </>
          )}
        </div>
      </section>

      {currentPhase === 'ready' && (
        <section className="remote-game-characters">
          <h2>Game Characters ({(state.gameCharacters || []).length} total)</h2>
          <div className="game-characters-table-container">
            <table className="game-characters-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {(state.gameCharacters || []).map((gc, index) => (
                  <tr key={`${gc.round}-${index}`}>
                    <td>{gc.round}</td>
                    <td>{gc.category}</td>
                    <td>
                      {gc.character.given_names} {gc.character.family_names}
                    </td>
                    <td>{gc.character.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="remote-status">
        <h2>Game Status</h2>
        <dl className="status-list">
          <dt>Phase:</dt>
          <dd>{currentPhase}</dd>
          <dt>Characters loaded:</dt>
          <dd>{state.characters.length}</dd>
          {currentPhase === 'ready' && (
            <>
              <dt>Game characters:</dt>
              <dd>{(state.gameCharacters || []).length}</dd>
            </>
          )}
          <dt>Used characters:</dt>
          <dd>{state.usedCharacters.length}</dd>
          <dt>Current category:</dt>
          <dd>{state.currentCategory || 'None'}</dd>
          <dt>Timer running:</dt>
          <dd>{state.isTimerRunning ? 'Yes' : 'No'}</dd>
          <dt>Time remaining:</dt>
          <dd>{state.timeRemaining}s</dd>
        </dl>
      </section>

      <section className="remote-scores">
        <h2>Scores</h2>
        <div className="teams">
          {config.teamNames.map((team) => (
            <div key={team} className="team-score">
              <span className="team-name">{team}</span>
              <span className="team-points">{state.scores[team] || 0}</span>
            </div>
          ))}
        </div>
      </section>

      {currentPhase === 'setup' && state.characters.length === 0 && (
        <section className="remote-warning">
          <p>
            <strong>No characters loaded.</strong> Please click "Load Characters" to load characters from a Google
            Sheet.
          </p>
        </section>
      )}

      {currentPhase === 'setup' &&
        (config.selectedDifficulties.length === 0 || config.selectedCategories.length === 0) && (
          <section className="remote-warning">
            <p>
              <strong>Configuration incomplete.</strong> Please select at least one difficulty and one category in the
              Config screen.
            </p>
          </section>
        )}

      <section className="remote-info">
        <h2>Information</h2>
        <p>
          This is the Game Master control interface. All changes made here will be reflected on the Player screen in
          real-time via localStorage synchronization.
        </p>
        <p>Full game controls (timer, hints, scoring, etc.) will be implemented in Phase 4.</p>
      </section>

      <ConfigModal
        open={isConfigModalOpen}
        onClose={() => {
          console.log('Config modal closing');
          setIsConfigModalOpen(false);
        }}
      />
      <PeopleDialog open={isPeopleDialogOpen} onClose={() => setIsPeopleDialogOpen(false)} />
    </div>
  );
}

export function RemoteScreen() {
  return (
    <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={true} defaultValue={initialGameConfig}>
      <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={false} defaultValue={initialGameStatus}>
        <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={true} defaultValue={null}>
          <RemoteScreenContent />
        </StorageProvider>
      </StorageProvider>
    </StorageProvider>
  );
}
