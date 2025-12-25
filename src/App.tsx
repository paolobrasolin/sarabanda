import React, { useEffect, useState } from 'react';
import './App.css';
import { ConfigScreen } from './components/ConfigScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerScreen } from './components/PlayerScreen';
import { RemoteScreen } from './components/RemoteScreen';
import { SplashScreen } from './components/SplashScreen';

type AppMode = 'splash' | 'config' | 'remote' | 'player';

const AppContent = () => {
  const [mode, setMode] = useState<AppMode>('splash');

  useEffect(() => {
    // Read mode from URL hash
    const hash = window.location.hash.slice(1); // Remove the '#' character
    if (hash && ['config', 'remote', 'player'].includes(hash)) {
      setMode(hash as AppMode);
    } else {
      setMode('splash');
    }
  }, []);

  return (
    <div className="app">
      {mode === 'splash' && <SplashScreen />}
      {mode === 'config' && <ConfigScreen />}
      {mode === 'remote' && <RemoteScreen />}
      {mode === 'player' && <PlayerScreen />}
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
