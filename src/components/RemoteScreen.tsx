import { Button } from '@ariakit/react';
import { useEffect, useRef } from 'react';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameState } from '../types';
import { initialGameState } from '../utils/initialState';
import { endGame, setTimeRemaining, setTimerRunning, startGame, updateCharacters } from '../utils/stateUpdates';
import { STORAGE_KEYS } from '../utils/storageKeys';

/**
 * RemoteScreen - Game Master control interface
 * This screen controls the game state and writes to localStorage.
 * PlayerScreen listens to these changes via storage events.
 */
function RemoteScreenContent() {
  const { value: state, update: updateState } = useStorage<GameState>(STORAGE_KEYS.STATUS);
  const { value: savedPeople } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);
  const timerIntervalRef = useRef<number | null>(null);
  const timeRemainingRef = useRef(state?.timeRemaining ?? 0);
  const stateRef = useRef(state);

  // Sync characters from PEOPLE storage to STATUS if STATUS doesn't have them
  useEffect(() => {
    if (state && savedPeople && savedPeople.length > 0 && state.characters.length === 0) {
      updateState(updateCharacters(state, savedPeople));
    }
  }, [state, savedPeople, updateState]);

  // Handle null state
  if (!state) {
    return (
      <div className="remote-screen">
        <section className="remote-header">
          <h1>Game Master Control</h1>
          <p>Loading game state...</p>
        </section>
      </div>
    );
  }

  const handleStartGame = () => {
    if (state.characters.length === 0) {
      alert('Please configure the game first by loading characters from a Google Sheet.');
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

  return (
    <div className="remote-screen">
      <section className="remote-header">
        <h1>Game Master Control</h1>
        <div className="remote-info">
          <div>
            {state.isGameActive ? (
              <>
                Round {state.currentRound} of {state.config.numberOfRounds}
              </>
            ) : (
              'Game Not Active'
            )}
          </div>
        </div>
      </section>

      <section className="remote-controls">
        <h2>Game Controls</h2>
        <div className="control-buttons">
          {!state.isGameActive ? (
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

      <section className="remote-status">
        <h2>Game Status</h2>
        <dl className="status-list">
          <dt>Characters loaded:</dt>
          <dd>{state.characters.length}</dd>
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
          {state.config.teamNames.map((team) => (
            <div key={team} className="team-score">
              <span className="team-name">{team}</span>
              <span className="team-points">{state.scores[team] || 0}</span>
            </div>
          ))}
        </div>
      </section>

      {state.characters.length === 0 && (
        <section className="remote-warning">
          <p>
            <strong>No characters loaded.</strong> Please go to the Config screen to load characters from a Google
            Sheet.
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
    </div>
  );
}

export function RemoteScreen() {
  return (
    <StorageProvider<GameState> storageKey={STORAGE_KEYS.STATUS} readOnly={false} defaultValue={initialGameState}>
      <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={true} defaultValue={null}>
        <RemoteScreenContent />
      </StorageProvider>
    </StorageProvider>
  );
}
