import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import { STORAGE_KEYS } from '../utils/storageKeys';

/**
 * PlayerScreen - Passive display screen for players
 * This screen is read-only and listens to localStorage changes
 * to stay in sync with RemoteScreen updates.
 */
function PlayerScreenContent() {
  const { value: state } = useStorage<GameStatus>(STORAGE_KEYS.STATUS);
  const { value: config } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);

  // Ensure phase is always set (fallback for migration)
  const currentPhase = state?.phase || 'setup';

  // Show loading/empty state if no game state is available
  if (!state || !config) {
    return (
      <div className="game-screen">
        <section className="game-header">
          <h1>Quiz Game</h1>
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
      <section className="game-header">
        <h1>Quiz Game</h1>
        <div className="game-info">
          {currentPhase === 'setup' ? (
            'Setting up game...'
          ) : currentPhase === 'ready' ? (
            `Ready - ${(state.gameCharacters || []).length} characters prepared`
          ) : state.isGameActive ? (
            <>
              Round {state.currentRound} of {config.numberOfRounds}
            </>
          ) : (
            'Game Not Started'
          )}
        </div>
      </section>

      <section className="scoreboard">
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

      <section className="game-content">
        {/* Timer display - always show for POC testing */}
        {(state.timeRemaining > 0 || state.isTimerRunning) && (
          <section className="timer-display">
            <h3>Timer</h3>
            <div className={`timer-value ${state.isTimerRunning ? 'timer-running' : 'timer-stopped'}`}>
              {state.timeRemaining}s
            </div>
            <div className="timer-status">{state.isTimerRunning ? '⏱️ Running' : '⏸️ Stopped'}</div>
          </section>
        )}

        {currentPhase === 'setup' ? (
          <div className="game-not-started">
            <h2>Game Setup</h2>
            <p>The Game Master is configuring the game. Please wait...</p>
          </div>
        ) : currentPhase === 'ready' && !state.isGameActive ? (
          <div className="game-not-started">
            <h2>Ready to Play</h2>
            <p>The game is prepared and ready to start!</p>
          </div>
        ) : !state.isGameActive ? (
          <div className="game-not-started">
            <h2>Ready to Play</h2>
            <p>Configure your game settings and start playing!</p>
          </div>
        ) : (
          <div className="game-active">
            <h2>Game Active</h2>

            <section className="debug-info">
              <h3>Debug Info</h3>
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

export function PlayerScreen() {
  return (
    <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={true} defaultValue={initialGameConfig}>
      <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={true} defaultValue={initialGameStatus}>
        <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={true} defaultValue={null}>
          <PlayerScreenContent />
        </StorageProvider>
      </StorageProvider>
    </StorageProvider>
  );
}
