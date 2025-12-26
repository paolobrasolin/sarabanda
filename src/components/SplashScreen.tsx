import { Button } from '@ariakit/react';
import mascotImage from '../assets/mascot.png';

export function SplashScreen() {
  const openMode = (mode: 'config' | 'remote' | 'player') => {
    const url = new URL(window.location.href);
    url.hash = mode;
    window.open(url.toString(), '_blank');
  };

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-left">
          <h1 className="splash-title">Sarabanda</h1>
          <div className="splash-buttons">
            <Button className="splash-btn splash-btn-primary" onClick={() => openMode('config')}>
              Config
            </Button>
            <Button className="splash-btn splash-btn-primary" onClick={() => openMode('remote')}>
              Remote
            </Button>
            <Button className="splash-btn splash-btn-primary" onClick={() => openMode('player')}>
              Player
            </Button>
          </div>
        </div>
        <div className="splash-right">
          <img src={mascotImage} alt="Sarabanda Mascot" className="splash-image" />
        </div>
      </div>
    </div>
  );
}
