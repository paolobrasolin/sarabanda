import { Button } from '@ariakit/react';

export function SplashScreen() {
  const openMode = (mode: 'config' | 'remote' | 'player') => {
    const url = new URL(window.location.href);
    url.hash = mode;
    window.open(url.toString(), '_blank');
  };

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
          <Button
            className="splash-btn splash-btn-primary"
            onClick={() => openMode('config')}
          >
            Config
          </Button>
          <Button
            className="splash-btn splash-btn-primary"
            onClick={() => openMode('remote')}
          >
            Remote
          </Button>
          <Button
            className="splash-btn splash-btn-primary"
            onClick={() => openMode('player')}
          >
            Player
          </Button>
        </div>
      </div>
    </div>
  );
}


