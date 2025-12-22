import { Button, Role } from '@ariakit/react';
import { useGame } from '../hooks/useGame';

interface GameScreenProps {
  onQuitGame: () => void;
}

export function GameScreen({ onQuitGame }: GameScreenProps) {
  const { state } = useGame();

  return (
    <div className="game-screen">
      <section className="game-header" aria-labelledby="game-title">
        <h1 id="game-title">Quiz Game</h1>
        <div className="game-info">
          <Role role="status" aria-live="polite" aria-atomic="true">
            Round {state.currentRound} of {state.config.numberOfRounds}
          </Role>
          <Button onClick={onQuitGame} className="quit-btn">
            Quit Game
          </Button>
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
        {!state.isGameActive ? (
          <div className="game-not-started">
            <h2 id="game-content-heading">Ready to Play</h2>
            <p>Configure your game settings and start playing!</p>
          </div>
        ) : (
          <div className="game-active">
            <h2 id="game-content-heading">Game Active</h2>
            <p>Game logic will be implemented in Phase 2</p>
            <section className="debug-info" aria-labelledby="debug-heading">
              <h3 id="debug-heading">Debug Info</h3>
              <dl>
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
          </div>
        )}
      </section>
    </div>
  );
}
