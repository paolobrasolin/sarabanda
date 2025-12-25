import { Role } from '@ariakit/react';
import { useStorage } from '../hooks/useStorage';
import type { GameState } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';

/**
 * PlayerScreen - Passive display screen for players
 * This screen is read-only and listens to localStorage changes
 * to stay in sync with RemoteScreen updates.
 */
export function PlayerScreen() {
  const { value: state } = useStorage<GameState>(STORAGE_KEYS.STATUS);

  // Show loading/empty state if no game state is available
  if (!state) {
    return (
      <div className="game-screen">
        <section className="game-header" aria-labelledby="game-title">
          <h1 id="game-title">Quiz Game</h1>
        </section>
        <section className="game-content">
          <div className="game-not-started">
            <h2>Waiting for Game Master</h2>
            <p>Game configuration will appear here once the Game Master starts a game.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <section className="game-header" aria-labelledby="game-title">
        <h1 id="game-title">Quiz Game</h1>
        <div className="game-info">
          <Role role="status" aria-live="polite" aria-atomic="true">
            {state.isGameActive ? (
              <>
                Round {state.currentRound} of {state.config.numberOfRounds}
              </>
            ) : (
              <>Game Not Started</>
            )}
          </Role>
        </div>
      </section>

      <section className="scoreboard" aria-labelledby="scores-heading">
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

      <section className="game-content" aria-labelledby="game-content-heading">
        {/* Timer display - always show for POC testing */}
        {(state.timeRemaining > 0 || state.isTimerRunning) && (
          <section className="timer-display" aria-labelledby="timer-heading">
            <h3 id="timer-heading">Timer</h3>
            <div className={`timer-value ${state.isTimerRunning ? 'timer-running' : 'timer-stopped'}`}>
              {state.timeRemaining}s
            </div>
            <div className="timer-status">{state.isTimerRunning ? '⏱️ Running' : '⏸️ Stopped'}</div>
          </section>
        )}

        {!state.isGameActive ? (
          <div className="game-not-started">
            <h2 id="game-content-heading">Ready to Play</h2>
            <p>Configure your game settings and start playing!</p>
          </div>
        ) : (
          <div className="game-active">
            <h2 id="game-content-heading">Game Active</h2>

            <section className="debug-info" aria-labelledby="debug-heading">
              <h3 id="debug-heading">Debug Info</h3>
              <dl>
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
          </div>
        )}
      </section>
    </div>
  );
}
