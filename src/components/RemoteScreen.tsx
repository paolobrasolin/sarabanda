import {
  Button,
  Select,
  SelectArrow,
  SelectItem,
  SelectItemCheck,
  SelectLabel,
  SelectPopover,
  SelectProvider,
} from '@ariakit/react';
import { useEffect, useRef, useState } from 'react';
import { ConfigModal } from './ConfigDialog';
import { PeopleDialog } from './PeopleDialog';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import {
  awardPoints,
  calculateTimeRemaining,
  completeRound,
  endGame,
  getTurnDuration,
  getTurnPoints,
  handleCorrectAnswer,
  handleIncorrectAnswer,
  markCharacterUsed,
  rerollCharacter,
  resetGame,
  startGame,
  startTimer,
  stopTimer,
  transitionToGuessing,
  updateCharacters,
} from '../utils/stateUpdates';
import { createCharacterId, getAvailableCharacters } from '../utils/gameHelpers';
import { STORAGE_KEYS } from '../utils/storageKeys';

/**
 * RemoteScreen - Game Master control interface
 * This screen controls the game state and writes to localStorage.
 * PlayerScreen listens to these changes via storage events.
 */
function RemoteScreenContent() {
  const { value: state, update: updateState } = useStorage<GameStatus>(STORAGE_KEYS.STATUS);
  const { value: config, update: updateConfig } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);
  const { value: savedPeople } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);
  const timerIntervalRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);
  const [selectedTeamForAward, setSelectedTeamForAward] = useState<string | null>(null);

  // Migrate old state format: ensure phase exists and migrate old phases
  useEffect(() => {
    if (state) {
      let needsMigration = false;
      const migratedState: any = { ...state };

      // Migrate phase
      if (!('phase' in state) || (state as any).phase === 'setup' || (state as any).phase === 'ready') {
        needsMigration = true;
        const oldPhase = (state as any).phase;
        let newPhase: 'prepping' | 'choosing' | 'guessing' = 'prepping';
        
        // Migrate old phases
        if (oldPhase === 'ready') {
          // If we were in ready, we should go back to prepping since we removed that phase
          newPhase = 'prepping';
        } else if (oldPhase === 'setup') {
          newPhase = 'prepping';
        }
        migratedState.phase = newPhase;
      }

      // Migrate timer fields (add if missing)
      if (!('timerEndsAt' in state)) {
        needsMigration = true;
        migratedState.timerEndsAt = null;
      }

      // Remove gameCharacters if it exists (we don't use it anymore)
      if ('gameCharacters' in migratedState) {
        needsMigration = true;
        delete migratedState.gameCharacters;
      }

      if (needsMigration) {
        updateState(migratedState as GameStatus);
      }
    }
  }, [state, updateState]);

  // Sync config from separate storage into state.config (for backward compatibility with state update functions)
  // This ensures state update functions that reference state.config continue to work
  useEffect(() => {
    if (state && config) {
      // Only update if config actually differs to avoid infinite loops
      const stateConfigString = JSON.stringify(state.config);
      const configString = JSON.stringify(config);
      if (stateConfigString !== configString) {
        updateState({ ...state, config });
      }
    }
  }, [state, config, updateState]);

  // Sync characters from PEOPLE storage to STATUS
  // Always keep STATUS.characters in sync with PEOPLE storage
  useEffect(() => {
    if (state && savedPeople) {
      // Check if characters need to be synced
      const stateCharsString = JSON.stringify(state.characters || []);
      const savedPeopleString = JSON.stringify(savedPeople);

      // Sync if PEOPLE has characters and they differ from STATUS
      if (savedPeople.length > 0 && stateCharsString !== savedPeopleString) {
        updateState(updateCharacters(state, savedPeople));
      } else if (savedPeople.length === 0 && state.characters.length > 0) {
        // Also sync if PEOPLE is empty but STATUS has characters (clear STATUS)
        updateState(updateCharacters(state, []));
      }
    }
  }, [state, savedPeople, updateState]);

  // Keep refs in sync with state
  useEffect(() => {
    if (state) {
      stateRef.current = state;
    }
  }, [state]);

  // Timer countdown effect - updates displayed timeRemaining based on timestamp
  useEffect(() => {
    if (!state) return;

    if (state.isTimerRunning && state.timerEndsAt) {
      // Clear any existing interval first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // Update the displayed timeRemaining every 100ms for smooth countdown
      timerIntervalRef.current = window.setInterval(() => {
        const currentState = stateRef.current;
        if (!currentState || !currentState.isTimerRunning || !currentState.timerEndsAt) {
          return;
        }

        const remaining = calculateTimeRemaining(currentState);
        
        // Update state with calculated remaining time (for display)
        if (remaining !== currentState.timeRemaining) {
          updateState({
            ...currentState,
            timeRemaining: remaining,
          });
        }

        // If timer expired, stop it
        if (remaining <= 0) {
          updateState(stopTimer(currentState));
        }
      }, 100); // Update every 100ms for smooth countdown
    } else {
      // Stop timer if not running
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Ensure timer is stopped if it should be
      if (state.isTimerRunning && !state.timerEndsAt) {
        updateState(stopTimer(state));
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [state, updateState]);

  // Reset team selection when phase or turn changes
  useEffect(() => {
    if (state?.phase !== 'guessing' || state?.turnType !== 'free-for-all') {
      setSelectedTeamForAward(null);
    }
  }, [state?.phase, state?.turnType]);

  // Handle null state or config
  if (!state || !config) {
    return (
      <div className="remote-screen">
        <section className="remote-section remote-header">
          <h1>Game Master Control</h1>
          <p>Loading game state...</p>
        </section>
      </div>
    );
  }

  // Ensure phase is always set (fallback for migration)
  const currentPhase = state.phase || 'prepping';

  const handleStartGame = () => {
    if (!config) {
      alert('Configuration not loaded. Please configure the game first.');
      return;
    }
    if (state.characters.length === 0) {
      alert('Please configure the game first by loading characters from a Google Sheet.');
      return;
    }
    if (config.selectedDifficulties.length === 0 || config.selectedCategories.length === 0) {
      alert('Please select at least one difficulty and one category in the configuration.');
      return;
    }

    // Merge config into state for the transition function
    const stateWithConfig = { ...state, config };

    // Check if any characters match the selected criteria
    const availableCharacters = stateWithConfig.characters.filter(
      (char) =>
        config.selectedDifficulties.includes(char.difficulty) && config.selectedCategories.includes(char.category),
    );

    if (availableCharacters.length === 0) {
      const availableDifficulties = [...new Set(state.characters.map((c) => c.difficulty))];
      const availableCategories = [...new Set(state.characters.map((c) => c.category))];
      alert(
        `No characters match the selected criteria.\n\n` +
        `Selected difficulties: ${config.selectedDifficulties.join(', ') || 'None'}\n` +
        `Selected categories: ${config.selectedCategories.join(', ') || 'None'}\n\n` +
        `Available difficulties: ${availableDifficulties.join(', ')}\n` +
        `Available categories: ${availableCategories.join(', ')}\n\n` +
        `Please adjust your selection in the Config screen.`,
      );
      return;
    }

    const newState = startGame(stateWithConfig);
    if (newState.phase === 'prepping') {
      alert('Failed to start game. Please check your configuration and try again.');
      return;
    }
    updateState(newState);
  };

  const handleConfirmCharacter = () => {
    if (currentPhase !== 'choosing') {
      return;
    }
    updateState(transitionToGuessing(state));
  };

  const handleRerollCharacter = () => {
    if (currentPhase !== 'choosing') {
      return;
    }
    const newState = rerollCharacter(state);
    if (!newState.currentCharacter) {
      alert('No characters available to re-roll. Please check your configuration.');
      return;
    }
    updateState(newState);
  };


  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the current game?')) {
      // Stop timer if running
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      updateState(endGame(state));
    }
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset the game? This will clear all game data and return to the setup phase.')) {
      // Stop timer if running
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      updateState(resetGame(state));
    }
  };

  const handleStartStopTimer = () => {
    if (state.isTimerRunning) {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      updateState(stopTimer(state));
    } else {
      // Start timer
      const duration = getTurnDuration(state);
      updateState(startTimer(state, duration));
    }
  };

  const onCorrectAnswer = () => {
    if (state.phase !== 'guessing') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    let newState = stopTimer(state);
    updateState(handleCorrectAnswer(newState));
  };

  const onIncorrectAnswer = () => {
    if (state.phase !== 'guessing') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    let newState = stopTimer(state);
    updateState(handleIncorrectAnswer(newState));
  };

  const handleAwardFreeForAll = (teamIndex: number | null) => {
    if (state.phase !== 'guessing' || state.turnType !== 'free-for-all') {
      return;
    }
    // Stop timer if running
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const points = getTurnPoints(state);
    
    // Track round scores before awarding
    const roundScores: Record<string, number> = {};
    if (teamIndex !== null) {
      const teamName = config.teamNames[teamIndex];
      if (teamName) {
        roundScores[teamName] = points;
      }
    }
    
    let newState = stopTimer(state);
    newState = awardPoints(newState, teamIndex, points);
    // Mark character as used
    if (state.currentCharacter) {
      const characterId = createCharacterId(state.currentCharacter);
      newState = markCharacterUsed(newState, characterId);
    }
    // Complete round and move to next
    updateState(completeRound(newState, roundScores));
    // Reset selection after awarding
    setSelectedTeamForAward(null);
  };

  const handleScoreChange = (round: number, team: string, value: string) => {
    // Parse the value as a number (supports decimals like 0.5)
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Validate: only allow numbers (including empty string for clearing)
    if (value !== '' && (isNaN(numValue) || numValue < 0)) {
      return; // Don't update if invalid
    }

    // Find the round in gameHistory and update its score
    const updatedGameHistory = state.gameHistory.map((roundResult) => {
      if (roundResult.round === round) {
        return {
          ...roundResult,
          scores: {
            ...roundResult.scores,
            [team]: numValue,
          },
        };
      }
      return roundResult;
    });

    // Recalculate total scores by summing all round scores
    const newScores: Record<string, number> = {};
    config.teamNames.forEach((teamName) => {
      newScores[teamName] = updatedGameHistory.reduce((sum, roundResult) => {
        return sum + (roundResult.scores[teamName] || 0);
      }, 0);
    });

    // Update state with new gameHistory and recalculated scores
    updateState({
      ...state,
      gameHistory: updatedGameHistory,
      scores: newScores,
    });
  };

  return (
    <div className="remote-screen">
      <section className="remote-section remote-status">
        <h2 className="remote-section-title">
          Game Manager
          <span>
            {currentPhase === 'prepping'
              ? 'Prepping'
              : currentPhase === 'choosing'
                ? 'Choosing'
                : currentPhase === 'guessing'
                  ? 'Guessing'
                  : currentPhase === 'stopping'
                    ? 'Stopped'
                    : 'Unknown'} phase
          </span>
        </h2>
        <div className="game-manager-card">
          <div className="game-manager-actions">
            <button
              className="config-btn"
              onClick={() => setIsPeopleDialogOpen(true)}
              disabled={state.isGameActive}
              aria-label="Load characters"
              title={state.isGameActive ? "Cannot load characters while game is active" : "Load characters from Google Sheet"}
            >
              People
            </button>
            <button
              className="config-btn"
              onClick={() => {
                console.log('Config button clicked, opening modal');
                setIsConfigModalOpen(true);
              }}
              aria-label="Open configuration"
              title="Open configuration"
            >
              Config
            </button>
            <Button
              onClick={handleStartGame}
              className="control-btn control-btn-primary"
              disabled={currentPhase !== 'prepping' || state.characters.length === 0}
            >
              Start
            </Button>
            <Button
              onClick={handleEndGame}
              className="control-btn control-btn-danger"
              disabled={currentPhase === 'prepping' || currentPhase === 'stopping'}
            >
              End
            </Button>
            <Button
              onClick={handleResetGame}
              className="control-btn control-btn-danger"
              disabled={currentPhase !== 'stopping'}
            >
              Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="remote-section remote-character-preview">
        <h2 className="remote-section-title">
          Round Manager
          <span>
            {currentPhase === 'stopping' 
              ? 'Game Ended' 
              : state.currentRound > 0 
                ? `Round ${state.currentRound}` 
                : 'No round active'}
          </span>
        </h2>
        <div className="character-preview-card">
          <div
            className="character-preview-image"
            style={
              state.currentCharacter
                ? ({ '--character-image-url': `url(${state.currentCharacter.image_url})` } as React.CSSProperties)
                : undefined
            }
          >
            {state.currentCharacter ? (
              <div
                className="character-preview-image-content"
                style={{ backgroundImage: `url(${state.currentCharacter.image_url})` }}
                role="img"
                aria-label={`${state.currentCharacter.given_names} ${state.currentCharacter.family_names}`}
              />
            ) : (
              <div className="character-preview-placeholder">No character selected</div>
            )}
          </div>
          <div className="character-preview-info">
            <dl>
              <div className="character-preview-field">
                <dt>Given Names:</dt>
                <dd>{state.currentCharacter?.given_names || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Family Names:</dt>
                <dd>{state.currentCharacter?.family_names || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Category:</dt>
                <dd>{state.currentCharacter?.category || '—'}</dd>
              </div>
              <div className="character-preview-field">
                <dt>Difficulty:</dt>
                <dd>{state.currentCharacter?.difficulty || '—'}</dd>
              </div>
            </dl>
          </div>
          <div className="character-preview-actions">
            {(() => {
              const chars = savedPeople || state.characters || [];
              const availableCategories = chars.length > 0 ? [...new Set(chars.map((c) => c.category))].sort() : [];
              const availableDifficulties = chars.length > 0 ? [...new Set(chars.map((c) => c.difficulty))].sort() : [];
              
              // Calculate filtered counts (matching selected difficulties/categories)
              const filteredAvailable = getAvailableCharacters(state);
              const filteredAvailableCount = filteredAvailable.length;
              const filteredTotalCount = state.characters.filter((char) => 
                config.selectedDifficulties.includes(char.difficulty) &&
                config.selectedCategories.includes(char.category)
              ).length;
              
              // Calculate unfiltered counts (all characters)
              const unfilteredAvailableCount = state.characters.filter((char) => {
                const id = createCharacterId(char);
                return !state.usedCharacters.includes(id);
              }).length;
              const unfilteredTotalCount = state.characters.length;
              
              return (
                <>
                  <div>
                    <SelectProvider
                      value={config.selectedDifficulties || []}
                      setValue={(value) => {
                        if (!config) return;
                        updateConfig({
                          ...config,
                          selectedDifficulties: Array.isArray(value) ? value.sort() : config.selectedDifficulties || [],
                        });
                      }}
                    >
                      <SelectLabel>Difficulties</SelectLabel>
                      <Select className="select-button" required>
                        {!config.selectedDifficulties || config.selectedDifficulties.length === 0
                          ? 'No selection'
                          : config.selectedDifficulties.length === 1
                            ? config.selectedDifficulties[0]
                            : `${config.selectedDifficulties.length} selected`}
                        <SelectArrow />
                      </Select>
                      <SelectPopover gutter={4} sameWidth className="select-popover">
                        {availableDifficulties.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty} className="select-item">
                            <SelectItemCheck />
                            {difficulty}
                          </SelectItem>
                        ))}
                      </SelectPopover>
                    </SelectProvider>
                  </div>
                  <div>
                    <SelectProvider
                      value={config.selectedCategories || []}
                      setValue={(value) => {
                        if (!config) return;
                        updateConfig({
                          ...config,
                          selectedCategories: Array.isArray(value) ? value.sort() : config.selectedCategories || [],
                        });
                      }}
                    >
                      <SelectLabel>Categories</SelectLabel>
                      <Select className="select-button">
                        {!config.selectedCategories || config.selectedCategories.length === 0
                          ? 'No selection'
                          : config.selectedCategories.length === 1
                            ? config.selectedCategories[0]
                            : `${config.selectedCategories.length} selected`}
                        <SelectArrow />
                      </Select>
                      <SelectPopover gutter={4} sameWidth className="select-popover">
                        {availableCategories.map((category) => (
                          <SelectItem key={category} value={category} className="select-item">
                            <SelectItemCheck />
                            {category}
                          </SelectItem>
                        ))}
                      </SelectPopover>
                    </SelectProvider>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.5rem 0',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary, inherit)'
                  }}>
                    Available: {filteredAvailableCount}/{filteredTotalCount} ({unfilteredAvailableCount}/{unfilteredTotalCount})
                  </div>
                  {(() => {
                    // Check if currentCharacter matches current filters
                    const currentCharacterMatchesFilters = state.currentCharacter && 
                      config.selectedDifficulties.includes(state.currentCharacter.difficulty) &&
                      config.selectedCategories.includes(state.currentCharacter.category);
                    
                    return (
                      <>
                        <Button
                          onClick={handleRerollCharacter}
                          className="control-btn"
                          disabled={currentPhase !== 'choosing' || filteredAvailableCount === 0}
                        >
                          Re-roll
                        </Button>
                        <Button
                          onClick={handleConfirmCharacter}
                          className="control-btn control-btn-primary"
                          disabled={currentPhase !== 'choosing' || !currentCharacterMatchesFilters}
                        >
                          Confirm
                        </Button>
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>
      </section>

      <section className="remote-section remote-turn-manager">
        <h2 className="remote-section-title">
          Turn Manager
          <span>
            {currentPhase === 'guessing' 
              ? state.turnType === 'free-for-all'
                ? 'Free-for-All'
                : state.currentTurn > 0
                  ? `Turn ${state.currentTurn}`
                  : 'No turn active'
              : 'No turn active'}
          </span>
        </h2>
        <div className="turn-actions">
          <Button
            onClick={handleStartStopTimer}
            disabled={currentPhase !== 'guessing'}
            className={`control-btn ${state.isTimerRunning ? 'control-btn-danger' : 'control-btn-primary'}`}
          >
            {state.isTimerRunning ? 'Stop Timer' : 'Start Timer'}
          </Button>
          <SelectProvider
            value={
              currentPhase === 'guessing' && state.turnType === 'free-for-all'
                ? selectedTeamForAward || ''
                : currentPhase === 'guessing' && state.currentTeamIndex !== null
                  ? config.teamNames[state.currentTeamIndex]
                  : ''
            }
            setValue={
              currentPhase === 'guessing' && state.turnType === 'free-for-all'
                ? (value) => setSelectedTeamForAward(value || null)
                : () => {} // No-op when not in free-for-all or not guessing
            }
          >
            <Select
              className="select-button"
              disabled={currentPhase !== 'guessing' || state.turnType !== 'free-for-all'}
            >
              <span className="select-button-text">
                {currentPhase === 'guessing' ? (
                  state.turnType === 'free-for-all' ? (
                    selectedTeamForAward === null || selectedTeamForAward === ''
                      ? 'Select team...'
                      : selectedTeamForAward
                  ) : (
                    state.currentTeamIndex !== null
                      ? config.teamNames[state.currentTeamIndex]
                      : 'No team selected'
                  )
                ) : (
                  'No turn active'
                )}
              </span>
              <SelectArrow />
            </Select>
            <SelectPopover gutter={4} sameWidth className="select-popover">
              {config.teamNames.map((team) => (
                <SelectItem key={team} value={team} className="select-item">
                  <SelectItemCheck />
                  {team}
                </SelectItem>
              ))}
            </SelectPopover>
          </SelectProvider>
          {currentPhase === 'guessing' ? (
            state.turnType === 'free-for-all' ? (
              <>
                <Button
                  onClick={() => {
                    if (selectedTeamForAward === null || selectedTeamForAward === '') return;
                    const teamIndex = config.teamNames.indexOf(selectedTeamForAward);
                    if (teamIndex === -1) return;
                    handleAwardFreeForAll(teamIndex);
                  }}
                  className="control-btn control-btn-primary"
                  disabled={selectedTeamForAward === null || selectedTeamForAward === ''}
                >
                  Award Points
                </Button>
                <Button
                  onClick={() => handleAwardFreeForAll(null)}
                  className="control-btn control-btn-danger"
                >
                  No Points
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onCorrectAnswer}
                  className="control-btn control-btn-primary"
                >
                  Award Points
                </Button>
                <Button
                  onClick={onIncorrectAnswer}
                  className="control-btn control-btn-danger"
                >
                  No Points
                </Button>
              </>
            )
          ) : (
            <>
              <Button
                disabled
                className="control-btn control-btn-primary"
              >
                Award Points
              </Button>
              <Button
                disabled
                className="control-btn control-btn-danger"
              >
                No Points
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="remote-section remote-scores">
        <h2 className="remote-section-title">Scores</h2>
        <div className="scores-table-container">
          <table className="scores-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Character</th>
                {config.teamNames.map((team) => (
                  <th key={team}>{team}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.gameHistory.map((roundResult) => (
                <tr key={roundResult.round}>
                  <td>{roundResult.round}</td>
                  <td>
                    {roundResult.character.given_names} {roundResult.character.family_names}
                  </td>
                  {config.teamNames.map((team) => (
                    <td key={team}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={roundResult.scores[team] || 0}
                        onChange={(e) => handleScoreChange(roundResult.round, team, e.target.value)}
                        className="score-input"
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'center',
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {state.gameHistory.length === 0 && (
                <tr>
                  <td colSpan={config.teamNames.length + 2} className="scores-table-empty-cell">
                    No rounds completed yet
                  </td>
                </tr>
              )}
              {state.gameHistory.length > 0 && (
                <tr className="scores-totals-row">
                  <td><strong>Total</strong></td>
                  <td></td>
                  {config.teamNames.map((team) => (
                    <td key={team}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={state.scores[team] || 0}
                        disabled
                        className="score-input"
                        style={{
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'center',
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          fontWeight: 'bold',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {currentPhase === 'prepping' && state.characters.length === 0 && (
        <section className="remote-section remote-warning">
          <p>
            <strong>No characters loaded.</strong> Please click "People" to load characters from a Google Sheet.
          </p>
        </section>
      )}

      {currentPhase === 'prepping' &&
        (config.selectedDifficulties.length === 0 || config.selectedCategories.length === 0) && (
          <section className="remote-section remote-warning">
            <p>
              <strong>Configuration incomplete.</strong> Please select at least one difficulty and one category in the
              Config screen.
            </p>
          </section>
        )}

      <ConfigModal
        open={isConfigModalOpen}
        onClose={() => {
          console.log('Config modal closing');
          setIsConfigModalOpen(false);
        }}
      />
      <PeopleDialog open={isPeopleDialogOpen} onClose={() => setIsPeopleDialogOpen(false)} />
    </div>
  );
}

export function RemoteScreen() {
  return (
    <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
      <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={false} defaultValue={initialGameStatus}>
        <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={true} defaultValue={null}>
          <RemoteScreenContent />
        </StorageProvider>
      </StorageProvider>
    </StorageProvider>
  );
}
