import { Button, Role } from '@ariakit/react';
import { useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';

/**
 * RemoteScreen - Game Master control interface
 * This screen controls the game state and writes to localStorage.
 * PlayerScreen listens to these changes via storage events.
 */
export function RemoteScreen() {
  const { state, dispatch } = useGame();
  const timerIntervalRef = useRef<number | null>(null);
  const timeRemainingRef = useRef(state.timeRemaining);

  const handleStartGame = () => {
    if (state.characters.length === 0) {
      alert('Please configure the game first by loading characters from a Google Sheet.');
      return;
    }
    dispatch({ type: 'START_GAME' });
  };

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the current game?')) {
      dispatch({ type: 'END_GAME' });
      // Stop timer if running
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      dispatch({ type: 'SET_TIMER_RUNNING', payload: false });
      dispatch({ type: 'SET_TIME_REMAINING', payload: 0 });
    }
  };

  const handleStartStopTimer = () => {
    if (state.isTimerRunning) {
      // Stop timer
      dispatch({ type: 'SET_TIMER_RUNNING', payload: false });
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else {
      // Start timer
      if (state.timeRemaining === 0) {
        // Initialize timer to 30 seconds if at 0
        dispatch({ type: 'SET_TIME_REMAINING', payload: 30 });
      }
      dispatch({ type: 'SET_TIMER_RUNNING', payload: true });
    }
  };

  // Keep ref in sync with state
  useEffect(() => {
    timeRemainingRef.current = state.timeRemaining;
  }, [state.timeRemaining]);

  // Timer countdown effect
  useEffect(() => {
    if (state.isTimerRunning && state.timeRemaining > 0) {
      // Clear any existing interval first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = window.setInterval(() => {
        const newTime = timeRemainingRef.current - 1;
        if (newTime <= 0) {
          // Timer reached 0, stop it
          dispatch({ type: 'SET_TIME_REMAINING', payload: 0 });
          dispatch({ type: 'SET_TIMER_RUNNING', payload: false });
        } else {
          dispatch({ type: 'SET_TIME_REMAINING', payload: newTime });
        }
      }, 1000);
    } else {
      // Stop timer if not running or time is 0
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (state.timeRemaining === 0 && state.isTimerRunning) {
        dispatch({ type: 'SET_TIMER_RUNNING', payload: false });
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [state.isTimerRunning, state.timeRemaining, dispatch]);

  return (
    <div className="remote-screen">
      <section className="remote-header" aria-labelledby="remote-title">
        <h1 id="remote-title">Game Master Control</h1>
        <div className="remote-info">
          <Role role="status" aria-live="polite" aria-atomic="true">
            {state.isGameActive ? (
              <>
                Round {state.currentRound} of {state.config.numberOfRounds}
              </>
            ) : (
              <>Game Not Active</>
            )}
          </Role>
        </div>
      </section>

      <section className="remote-controls" aria-labelledby="controls-heading">
        <h2 id="controls-heading">Game Controls</h2>
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

      <section className="remote-status" aria-labelledby="status-heading">
        <h2 id="status-heading">Game Status</h2>
        <dl className="status-list">
          <dt>Characters loaded:</dt>
          <dd>{state.characters.length}</dd>
          <dt>Used characters:</dt>
          <dd>{state.usedCharacters.size}</dd>
          <dt>Current category:</dt>
          <dd>{state.currentCategory || 'None'}</dd>
          <dt>Timer running:</dt>
          <dd>{state.isTimerRunning ? 'Yes' : 'No'}</dd>
          <dt>Time remaining:</dt>
          <dd>{state.timeRemaining}s</dd>
        </dl>
      </section>

      <section className="remote-scores" aria-labelledby="scores-heading">
        <h2 id="scores-heading">Scores</h2>
        <div className="teams" role="list" aria-label="Team scores">
          {state.config.teamNames.map((team) => (
            <div
              key={team}
              className="team-score"
              role="listitem"
              aria-label={`${team}: ${state.scores[team] || 0} points`}
            >
              <span className="team-name">{team}</span>
              <span className="team-points" aria-label={`${state.scores[team] || 0} points`}>
                {state.scores[team] || 0}
              </span>
            </div>
          ))}
        </div>
      </section>

      {state.characters.length === 0 && (
        <section className="remote-warning" role="alert">
          <p>
            <strong>No characters loaded.</strong> Please go to the Config screen to load characters from a Google
            Sheet.
          </p>
        </section>
      )}

      <section className="remote-info" aria-labelledby="info-heading">
        <h2 id="info-heading">Information</h2>
        <p>
          This is the Game Master control interface. All changes made here will be reflected on the Player screen in
          real-time via localStorage synchronization.
        </p>
        <p>Full game controls (timer, hints, scoring, etc.) will be implemented in Phase 4.</p>
      </section>
    </div>
  );
}
