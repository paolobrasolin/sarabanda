import { Button } from '@ariakit/react';
import mascotImage from '../assets/mascot.png';
import { STORAGE_KEYS } from '../utils/storageKeys';

export function SplashScreen() {
  const openMode = (mode: 'config' | 'remote' | 'player') => {
    const url = new URL(window.location.href);
    url.hash = mode;
    window.open(url.toString(), '_blank');
  };

  const handleHardReset = () => {
    if (confirm('Are you sure you want to clear all data and reset the app? This cannot be undone.')) {
      // Clear all localStorage data
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      // Reload the page to start fresh
      window.location.reload();
    }
  };

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-left">
          <h1 className="splash-title">
            Sarabanda <span className="splash-version">{process.env.APP_VERSION}</span>
          </h1>
          <div className="splash-buttons">
            <Button className="splash-btn splash-btn-primary" onClick={() => openMode('remote')}>
              Remote
            </Button>
            <Button className="splash-btn splash-btn-primary" onClick={() => openMode('player')}>
              Player
            </Button>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary, #666)' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              Unsure how to proceed? Click to{' '}
              <a
                href="https://github.com/paolobrasolin/sarabanda/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--accent-primary, #007bff)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                open the readme
              </a>
              .
            </div>
            <div>
              If the remote is crashing, click to{' '}
              <button
                onClick={handleHardReset}
                style={{
                  fontSize: '0.875rem',
                  padding: '0',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-primary, #007bff)',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-danger, #dc3545)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary, #007bff)';
                }}
              >
                do a hard reset
              </button>
              .
            </div>
          </div>
        </div>
        <div className="splash-right">
          <img src={mascotImage} alt="Sarabanda Mascot" className="splash-image" />
        </div>
      </div>
    </div>
  );
}
