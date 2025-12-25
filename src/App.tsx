import React, { useEffect, useState } from 'react';
import './App.css';
import { ConfigScreen } from './components/ConfigScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlayerScreen } from './components/PlayerScreen';
import { RemoteScreen } from './components/RemoteScreen';
import { SplashScreen } from './components/SplashScreen';
import { StorageProvider } from './hooks/useStorage';
import type { Character, GameConfig, GameState } from './types';
import { initialGameConfig, initialGameState } from './utils/initialState';
import { STORAGE_KEYS } from './utils/storageKeys';

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

  // Render content with appropriate StorageProviders based on mode
  const renderContent = () => {
    if (mode === 'splash') {
      return <SplashScreen />;
    }

    if (mode === 'remote') {
      return (
        <StorageProvider<GameState>
          storageKey={STORAGE_KEYS.STATUS}
          readOnly={false}
          defaultValue={initialGameState}
        >
          <StorageProvider<Character[]>
            storageKey={STORAGE_KEYS.PEOPLE}
            readOnly={true}
            defaultValue={null}
          >
            <RemoteScreen />
          </StorageProvider>
        </StorageProvider>
      );
    }

    if (mode === 'player') {
      return (
        <StorageProvider<GameState>
          storageKey={STORAGE_KEYS.STATUS}
          readOnly={true}
          defaultValue={initialGameState}
        >
          <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={true} defaultValue={null}>
            <PlayerScreen />
          </StorageProvider>
        </StorageProvider>
      );
    }

    if (mode === 'config') {
      return (
        <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
          <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={false} defaultValue={null}>
            <StorageProvider<GameState>
              storageKey={STORAGE_KEYS.STATUS}
              readOnly={true}
              defaultValue={initialGameState}
            >
              <ConfigScreen />
            </StorageProvider>
          </StorageProvider>
        </StorageProvider>
      );
    }

    return null;
  };

  return <div className="app">{renderContent()}</div>;
};

const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
