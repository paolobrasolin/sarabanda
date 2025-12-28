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
  const currentPhase = state?.phase || 'prepping';

  // Show loading/empty state if no game state is available
  if (!state || !config) {
    return (
      <div className="player-screen">
        <div className="player-main-content">
          <div className="player-status-message">
            <h2>PLEASE WAIT</h2>
            <p>Waiting for the Game Master to start</p>
          </div>
        </div>
        <div className="player-sidebar">
          <div className="player-scoreboard"></div>
          <div className="player-timer"></div>
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
        {currentPhase === 'prepping' ? (
          <div className="player-status-message">
            <h2>PLEASE WAIT</h2>
            <p>The Game Master is setting up the game</p>
          </div>
        ) : currentPhase === 'choosing' ? (
          <div className="player-status-message">
            <h2>GET READY</h2>
            <p>The Game Master is choosing the character</p>
          </div>
        ) : currentPhase === 'guessing' && state.currentCharacter ? (
          <div 
            className="player-character-display"
            style={{ '--character-image-url': `url(${state.currentCharacter.image_url})` } as React.CSSProperties}
          >
            <img
              src={state.currentCharacter.image_url}
              alt={`${state.currentCharacter.given_names} ${state.currentCharacter.family_names}`}
              className="player-character-image"
            />
          </div>
        ) : (
          <div className="player-status-message">
            <h2>Game Active</h2>
            <p>Waiting for next character...</p>
          </div>
        )}
      </div>

      <div className="player-sidebar">
        <div className="player-scoreboard">
          {config.teamNames.map((team, index) => {
            const isCurrentTeam = state.turnType === 'free-for-all' || 
              (state.turnType === 'team' && state.currentTeamIndex === index);
            return (
              <div 
                key={team} 
                className={`player-team-score ${isCurrentTeam ? 'player-team-current' : ''}`}
              >
                <span className="player-team-name">{team}</span>
                <span className="player-team-points">{state.scores[team] || 0}</span>
              </div>
            );
          })}
        </div>

        <div className="player-timer">
          {state.isTimerRunning && state.timeRemaining > 0 && (
            <div className="player-timer-value timer-running">
              {state.timeRemaining}s
            </div>
          )}
        </div>

        <div className="player-mascot">
          <img src={mascotImage} alt="Sarabanda Mascot" className="player-mascot-image" />
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
