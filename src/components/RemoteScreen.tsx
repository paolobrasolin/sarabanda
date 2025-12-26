import { Button } from '@ariakit/react';
import { useEffect, useRef, useState } from 'react';
import { ConfigModal } from './ConfigDialog';
import { PeopleDialog } from './PeopleDialog';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import {
  awardPoints,
  completeRound,
  endGame,
  getTurnDuration,
  getTurnPoints,
  handleCorrectAnswer,
  handleIncorrectAnswer,
  markCharacterUsed,
  rerollCharacter,
  setTimeRemaining,
  setTimerRunning,
  startGame,
  transitionToGuessing,
  transitionToPrepping,
  updateCharacters,
} from '../utils/stateUpdates';
import { createCharacterId } from '../utils/gameHelpers';
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

  // Migrate old state format: ensure phase exists and migrate old phases
  useEffect(() => {
    if (state && (!('phase' in state) || (state as any).phase === 'setup' || (state as any).phase === 'ready')) {
      const oldPhase = (state as any).phase;
      let newPhase: 'prepping' | 'choosing' | 'guessing' = 'prepping';
      
      // Migrate old phases
      if (oldPhase === 'ready') {
        // If we were in ready, we should go back to prepping since we removed that phase
        newPhase = 'prepping';
      } else if (oldPhase === 'setup') {
        newPhase = 'prepping';
      }

      const migratedState = {
        ...state,
        phase: newPhase,
      };
      // Remove gameCharacters if it exists (we don't use it anymore)
      if ('gameCharacters' in migratedState) {
        delete (migratedState as any).gameCharacters;
      }
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
  const currentPhase = state.phase || 'prepping';

  const handleBackToPrepping = () => {
    if (confirm('Are you sure you want to go back to prepping? This will clear current game progress, but used characters will be preserved.')) {
      updateState(transitionToPrepping(state));
    }
  };

  const handleStartGame = () => {
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

    // Check if any characters match the selected criteria
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

    const newState = startGame(stateWithConfig);
    if (newState.phase === 'prepping') {
      alert('Failed to start game. Please check your configuration and try again.');
      return;
    }
    updateState(newState);
  };

  const handleConfirmCharacter = () => {
    if (currentPhase !== 'choosing') {
      return;
    }
    updateState(transitionToGuessing(state));
  };

  const handleRerollCharacter = () => {
    if (currentPhase !== 'choosing') {
      return;
    }
    const newState = rerollCharacter(state);
    if (!newState.currentCharacter) {
      alert('No characters available to re-roll. Please check your configuration.');
      return;
    }
    updateState(newState);
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
        // Initialize timer to the appropriate duration for current turn
        const duration = getTurnDuration(state);
        newState = setTimeRemaining(newState, duration);
      }
      updateState(setTimerRunning(newState, true));
    }
  };

  const onCorrectAnswer = () => {
    if (state.phase !== 'guessing') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    updateState(handleCorrectAnswer(state));
  };

  const onIncorrectAnswer = () => {
    if (state.phase !== 'guessing') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    updateState(handleIncorrectAnswer(state));
  };

  const handleAwardFreeForAll = (teamIndex: number | null) => {
    if (state.phase !== 'guessing' || state.turnType !== 'free-for-all') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const points = getTurnPoints(state);
    let newState = awardPoints(state, teamIndex, points);
    // Mark character as used
    if (state.currentCharacter) {
      const characterId = createCharacterId(state.currentCharacter);
      newState = markCharacterUsed(newState, characterId);
    }
    // Complete round and move to next
    updateState(completeRound(newState));
  };

  return (
    <div className="remote-screen">
      <section className="remote-status">
        <h2>Game Manager</h2>
        <div className="game-manager-card">
          <div className="game-manager-info">
            <dl>
              <div className="character-preview-field">
                <dt>Phase:</dt>
                <dd>{currentPhase}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Characters loaded:</dt>
                <dd>{state.characters.length}</dd>
              </div>
              {currentPhase !== 'prepping' && (
                <>
                  <div className="character-preview-field">
                    <dt>Current round:</dt>
                    <dd>{state.currentRound}</dd>
                  </div>
                  {currentPhase === 'guessing' && (
                    <div className="character-preview-field">
                      <dt>Current turn:</dt>
                      <dd>
                        {state.turnType === 'free-for-all'
                          ? 'Free-for-All'
                          : state.currentTeamIndex !== null
                            ? `Turn ${state.currentTurn} - ${config.teamNames[state.currentTeamIndex]}`
                            : 'No turn active'}
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div className="character-preview-field">
                <dt>Used characters:</dt>
                <dd>{state.usedCharacters.length}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Current category:</dt>
                <dd>{state.currentCategory || 'None'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Timer running:</dt>
                <dd>{state.isTimerRunning ? 'Yes' : 'No'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Time remaining:</dt>
                <dd>{state.timeRemaining}s</dd>
              </div>
            </dl>
          </div>
          <div className="game-manager-actions">
            <button
              className="config-btn"
              onClick={() => setIsPeopleDialogOpen(true)}
              disabled={state.isGameActive}
              aria-label="Load characters"
              title={state.isGameActive ? "Cannot load characters while game is active" : "Load characters from Google Sheet"}
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
            <Button
              onClick={handleStartGame}
              className="control-btn control-btn-primary"
              disabled={currentPhase !== 'prepping' || state.characters.length === 0}
            >
              Start Game
            </Button>
            <Button
              onClick={handleBackToPrepping}
              className="control-btn"
              disabled={currentPhase !== 'choosing'}
            >
              Back to Prepping
            </Button>
            <Button
              onClick={handleEndGame}
              className="control-btn control-btn-danger"
              disabled={currentPhase === 'prepping' || currentPhase === 'choosing'}
            >
              End Game
            </Button>
          </div>
        </div>
      </section>

      <section className="remote-character-preview">
        <h2>Round Manager</h2>
        <div className="character-preview-card">
          <div className="character-preview-image">
            {state.currentCharacter ? (
              <img
                src={state.currentCharacter.image_url}
                alt={`${state.currentCharacter.given_names} ${state.currentCharacter.family_names}`}
              />
            ) : (
              <div className="character-preview-placeholder">No character selected</div>
            )}
          </div>
          <div className="character-preview-info">
            <dl>
              <div className="character-preview-field">
                <dt>Given Names:</dt>
                <dd>{state.currentCharacter?.given_names || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Family Names:</dt>
                <dd>{state.currentCharacter?.family_names || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Category:</dt>
                <dd>{state.currentCharacter?.category || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Difficulty:</dt>
                <dd>{state.currentCharacter?.difficulty || '—'}</dd>
              </div>
            </dl>
          </div>
          <div className="character-preview-actions">
            <div className="character-preview-round">
              {state.currentRound > 0 ? `Round ${state.currentRound}` : 'No round active'}
            </div>
            <Button
              onClick={handleConfirmCharacter}
              className="control-btn control-btn-primary"
              disabled={currentPhase !== 'choosing' || !state.currentCharacter}
            >
              Confirm
            </Button>
            <Button
              onClick={handleRerollCharacter}
              className="control-btn"
              disabled={currentPhase !== 'choosing' || !state.currentCharacter}
            >
              Re-roll
            </Button>
          </div>
        </div>
      </section>

      <section className="remote-turn-manager">
        <h2>Turn Manager</h2>
        {currentPhase === 'guessing' ? (
          state.turnType === 'free-for-all' ? (
            <div className="turn-info">
              <strong>Free-for-All</strong>
              <div className="turn-actions">
                {config.teamNames.map((team, index) => (
                  <Button
                    key={team}
                    onClick={() => handleAwardFreeForAll(index)}
                    className="control-btn control-btn-primary"
                  >
                    Award to {team}
                  </Button>
                ))}
                <Button
                  onClick={() => handleAwardFreeForAll(null)}
                  className="control-btn"
                >
                  No Points
                </Button>
              </div>
              <div className="turn-timer-control">
                <Button
                  onClick={handleStartStopTimer}
                  className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
                >
                  {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="turn-info">
              <strong>
                {state.currentTeamIndex !== null
                  ? `${config.teamNames[state.currentTeamIndex]}'s Turn`
                  : 'No Turn Active'}
              </strong>
              <div className="turn-actions">
                <Button
                  onClick={onCorrectAnswer}
                  className="control-btn control-btn-primary"
                >
                  Correct Answer
                </Button>
                <Button
                  onClick={onIncorrectAnswer}
                  className="control-btn"
                >
                  Incorrect/Timeout
                </Button>
              </div>
              <div className="turn-timer-control">
                <Button
                  onClick={handleStartStopTimer}
                  className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
                >
                  {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="turn-info">
            <strong>No Turn Active</strong>
            <div className="turn-actions">
              <Button
                disabled
                className="control-btn control-btn-primary"
              >
                Correct Answer
              </Button>
              <Button
                disabled
                className="control-btn"
              >
                Incorrect/Timeout
              </Button>
            </div>
            <div className="turn-timer-control">
              <Button
                onClick={handleStartStopTimer}
                disabled
                className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
              >
                {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'}
              </Button>
            </div>
          </div>
        )}
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

      {currentPhase === 'prepping' && state.characters.length === 0 && (
        <section className="remote-warning">
          <p>
            <strong>No characters loaded.</strong> Please click "People" to load characters from a Google Sheet.
          </p>
        </section>
      )}

      {currentPhase === 'prepping' &&
        (config.selectedDifficulties.length === 0 || config.selectedCategories.length === 0) && (
          <section className="remote-warning">
            <p>
              <strong>Configuration incomplete.</strong> Please select at least one difficulty and one category in the
              Config screen.
            </p>
          </section>
        )}

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
