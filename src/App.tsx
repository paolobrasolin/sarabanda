import React, { useState } from 'react';
import './App.css';
import { ConfigurationScreen } from './components/ConfigurationScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameScreen } from './components/GameScreen';
import { SplashScreen } from './components/SplashScreen';
import { GameProvider, useGame } from './hooks/useGame';

type AppScreen = 'splash' | 'configuration' | 'game';

const AppContent = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const { dispatch } = useGame();

  const handlePlay = () => {
    setCurrentScreen('configuration');
  };

  const handleContinue = () => {
    setCurrentScreen('game');
  };

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME' });
    setCurrentScreen('game');
  };

  const handleQuitGame = () => {
    dispatch({ type: 'END_GAME' });
    setCurrentScreen('splash');
  };

  return (
    <div className="app">
      {currentScreen === 'splash' ? (
        <SplashScreen onPlay={handlePlay} onContinue={handleContinue} />
      ) : currentScreen === 'configuration' ? (
        <ConfigurationScreen onStartGame={handleStartGame} />
      ) : (
        <GameScreen onQuitGame={handleQuitGame} />
      )}
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <GameProvider>
        <ConfigurationScreen onStartGame={() => { }} />
      </GameProvider>
    </ErrorBoundary>
  );
};

export default App;
