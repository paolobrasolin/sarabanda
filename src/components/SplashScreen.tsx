import { Button } from '@ariakit/react';
import { useGame } from '../hooks/useGame';

interface SplashScreenProps {
  onPlay: () => void;
  onContinue: () => void;
}

export function SplashScreen({ onPlay, onContinue }: SplashScreenProps) {
  const { state } = useGame();
  const hasOngoingGame = state.isGameActive;

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-image-container">
          <img
            src="https://via.placeholder.com/400x300?text=Quiz+Game"
            alt="Quiz Game"
            className="splash-image"
          />
        </div>
        <h1 className="splash-title">Quiz Game</h1>
        <div className="splash-buttons">
          {hasOngoingGame ? (
            <Button className="splash-btn splash-btn-primary" onClick={onContinue}>
              Continue
            </Button>
          ) : (
            <Button className="splash-btn splash-btn-primary" onClick={onPlay}>
              Play
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
