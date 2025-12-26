import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import { STORAGE_KEYS } from '../utils/storageKeys';
import mascotImage from '../assets/mascot.png';

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
      <div className="player-screen">
        <div className="player-main-content">
          <div className="player-status-message">
            <h2>Waiting for Game Master</h2>
            <p>Game configuration will appear here once the Game Master starts a game.</p>
          </div>
        </div>
        <div className="player-sidebar">
          <div className="player-mascot">
            <img src={mascotImage} alt="Sarabanda Mascot" className="player-mascot-image" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-screen">
      <div className="player-main-content">
        {currentPhase === 'setup' ? (
          <div className="player-status-message">
            <h2>Game Setup</h2>
            <p>The Game Master is configuring the game. Please wait...</p>
          </div>
        ) : currentPhase === 'ready' && !state.isGameActive ? (
          <div className="player-status-message">
            <h2>Ready to Play</h2>
            <p>The game is prepared and ready to start!</p>
          </div>
        ) : !state.isGameActive ? (
          <div className="player-status-message">
            <h2>Ready to Play</h2>
            <p>Configure your game settings and start playing!</p>
          </div>
        ) : state.currentCharacter ? (
          <div className="player-character-display">
            <img
              src={state.currentCharacter.image_url}
              alt={`${state.currentCharacter.given_names} ${state.currentCharacter.family_names}`}
              className="player-character-image"
            />
            {state.currentCategory && (
              <div className="player-category-badge">{state.currentCategory}</div>
            )}
          </div>
        ) : (
          <div className="player-status-message">
            <h2>Game Active</h2>
            <p>Waiting for next character...</p>
          </div>
        )}
      </div>

      <div className="player-sidebar">
        <div className="player-mascot">
          <img src={mascotImage} alt="Sarabanda Mascot" className="player-mascot-image" />
        </div>

        <div className="player-scoreboard">
          <div className="player-teams">
            {config.teamNames.map((team) => (
              <div key={team} className="player-team-score">
                <span className="player-team-name">{team}</span>
                <span className="player-team-points">{state.scores[team] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="player-timer">
          <div className={`player-timer-value ${state.isTimerRunning ? 'timer-running' : 'timer-stopped'}`}>
            {state.isTimerRunning && state.timeRemaining > 0 ? `${state.timeRemaining}s` : '--:--'}
          </div>
        </div>
      </div>
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
