import React, { useEffect, useState } from 'react';
import './App.css';
import { ConfigScreen } from './components/ConfigScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerScreen } from './components/PlayerScreen';
import { RemoteScreen } from './components/RemoteScreen';
import { SplashScreen } from './components/SplashScreen';
import { GameProvider, useGame } from './hooks/useGame';

type AppMode = 'splash' | 'config' | 'remote' | 'player';

const AppContent = () => {
  const [mode, setMode] = useState<AppMode>('splash');
  const { dispatch } = useGame();

  useEffect(() => {
    // Read mode from URL hash
    const hash = window.location.hash.slice(1); // Remove the '#' character
    if (hash && ['config', 'remote', 'player'].includes(hash)) {
      setMode(hash as AppMode);
    } else {
      setMode('splash');
    }
  }, []);

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME' });
    // Navigate to game screen (could be a separate mode or handled differently)
  };

  return (
    <div className="app">
      {mode === 'splash' ? (
        <SplashScreen />
      ) : mode === 'config' ? (
        <ConfigScreen onStartGame={handleStartGame} />
      ) : mode === 'remote' ? (
        <RemoteScreen />
      ) : mode === 'player' ? (
        <PlayerScreen />
      ) : null}
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
};

export default App;
