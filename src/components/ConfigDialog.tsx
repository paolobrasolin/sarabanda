import {
  Dialog,
  DialogDismiss,
  DialogHeading,
  DialogProvider,
  Form,
  FormGroup,
  FormInput,
  FormLabel,
  FormProvider,
  Select,
  SelectArrow,
  SelectItem,
  SelectItemCheck,
  SelectLabel,
  SelectPopover,
  SelectProvider,
} from '@ariakit/react';
import React, { useEffect, useState } from 'react';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import { STORAGE_KEYS } from '../utils/storageKeys';

function ConfigDialogContent() {
  const { value: gameStatus } = useStorage<GameStatus>(STORAGE_KEYS.STATUS);
  const { update: updateConfigStorage } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);
  const { value: loadedCharacters } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);

  // Compute available categories and difficulties from loaded characters
  const validationStatus = React.useMemo(() => {
    const chars = loadedCharacters || gameStatus?.characters || [];
    if (chars.length === 0) return null;
    const categories = [...new Set(chars.map((c) => c.category))].sort();
    const difficulties = [...new Set(chars.map((c) => c.difficulty))].sort();
    return {
      isValid: true,
      characterCount: chars.length,
      categories,
      difficulties,
    };
  }, [loadedCharacters, gameStatus?.characters]);
  const [config, setConfig] = useState<GameConfig>(() => {
    // Try to load from localStorage directly first, then fallback
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved) as GameConfig;
        const teamCount = parsed.teamNames?.length || 2;
        const nthTurnDurations = Array.isArray(parsed.nthTurnDurations) ? parsed.nthTurnDurations : [];
        const nthTurnScores = Array.isArray(parsed.nthTurnScores) ? parsed.nthTurnScores : [];
        return {
          ...parsed,
          nthTurnDurations:
            nthTurnDurations.length === teamCount
              ? nthTurnDurations
              : Array.from({ length: teamCount }, (_, i) => nthTurnDurations[i] || nthTurnDurations[0] || 60),
          nthTurnScores:
            nthTurnScores.length === teamCount
              ? nthTurnScores
              : Array.from({ length: teamCount }, (_, i) => nthTurnScores[i] || nthTurnScores[0] || 0.5),
        };
      }
    } catch {
      // Fall through to default
    }
    const initialConfig = gameStatus?.config || initialGameConfig;
    const teamCount = initialConfig.teamNames?.length || 2;
    const nthTurnDurations = Array.isArray(initialConfig.nthTurnDurations) ? initialConfig.nthTurnDurations : [];
    const nthTurnScores = Array.isArray(initialConfig.nthTurnScores) ? initialConfig.nthTurnScores : [];

    return {
      ...initialConfig,
      nthTurnDurations:
        nthTurnDurations.length === teamCount
          ? nthTurnDurations
          : Array.from({ length: teamCount }, (_, i) => nthTurnDurations[i] || nthTurnDurations[0] || 60),
      nthTurnScores:
        nthTurnScores.length === teamCount
          ? nthTurnScores
          : Array.from({ length: teamCount }, (_, i) => nthTurnScores[i] || nthTurnScores[0] || 0.5),
    };
  });
  const [numberOfTeams, setNumberOfTeams] = useState(config.teamNames?.length || 2);
  const [numberOfRounds, setNumberOfRounds] = useState(config.numberOfRounds);

  // Sync team names array when number of teams changes
  useEffect(() => {
    setConfig((prev) => {
      const currentTeamCount = prev.teamNames.length;
      if (numberOfTeams !== currentTeamCount) {
        if (numberOfTeams > currentTeamCount) {
          // Add new teams
          const newTeams = Array.from({ length: numberOfTeams - currentTeamCount }, (_, i) => {
            return `Team ${currentTeamCount + i + 1}`;
          });
          const newTurnScores = Array.from({ length: numberOfTeams - currentTeamCount }, () => 0.5);
          const defaultDuration = currentTeamCount > 0 ? prev.nthTurnDurations[currentTeamCount - 1] : 60;
          const newTurnDurations = Array.from({ length: numberOfTeams - currentTeamCount }, () => defaultDuration);
          return {
            ...prev,
            teamNames: [...prev.teamNames, ...newTeams],
            nthTurnDurations: [...prev.nthTurnDurations, ...newTurnDurations],
            nthTurnScores: [...prev.nthTurnScores, ...newTurnScores],
          };
        } else {
          // Remove extra teams
          return {
            ...prev,
            teamNames: prev.teamNames.slice(0, numberOfTeams),
            nthTurnDurations: prev.nthTurnDurations.slice(0, numberOfTeams),
            nthTurnScores: prev.nthTurnScores.slice(0, numberOfTeams),
          };
        }
      }
      return prev;
    });
  }, [numberOfTeams]);

  // Sync numberOfRounds in config when it changes
  useEffect(() => {
    setConfig((prev) => {
      if (prev.numberOfRounds !== numberOfRounds) {
        return {
          ...prev,
          numberOfRounds,
        };
      }
      return prev;
    });
  }, [numberOfRounds]);

  // Persist config to localStorage on every change
  // Use a ref to track the last saved config to avoid infinite loops
  const lastSavedConfigRef = React.useRef<string | null>(null);
  useEffect(() => {
    const configString = JSON.stringify(config);
    // Only update if config actually changed
    if (lastSavedConfigRef.current !== configString) {
      lastSavedConfigRef.current = configString;
      updateConfigStorage(config);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, updateConfigStorage]);


  return (
    <div className="configuration-screen">
      <section className="config-section">
        <FormProvider>
          <Form>

            <div className="game-settings-row">
              <FormGroup>
                <FormLabel name="number-of-rounds">Number of Rounds</FormLabel>
                <FormInput
                  name="number-of-rounds"
                  type="number"
                  min="1"
                  value={numberOfRounds.toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setNumberOfRounds(Math.max(1, value));
                  }}
                />
              </FormGroup>

              <FormGroup>
                <SelectProvider
                  value={config.selectedDifficulties || []}
                  setValue={(value) => {
                    setConfig((prev) => ({
                      ...prev,
                      selectedDifficulties: Array.isArray(value) ? value.sort() : prev.selectedDifficulties || [],
                    }));
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
                    {validationStatus?.difficulties?.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty} className="select-item">
                        <SelectItemCheck />
                        {difficulty}
                      </SelectItem>
                    )) || []}
                  </SelectPopover>
                </SelectProvider>
              </FormGroup>

              <FormGroup>
                <SelectProvider
                  value={config.selectedCategories || []}
                  setValue={(value) => {
                    setConfig((prev) => ({
                      ...prev,
                      selectedCategories: Array.isArray(value) ? value.sort() : prev.selectedCategories || [],
                    }));
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
                    {validationStatus?.categories?.map((category) => (
                      <SelectItem key={category} value={category} className="select-item">
                        <SelectItemCheck />
                        {category}
                      </SelectItem>
                    )) || []}
                  </SelectPopover>
                </SelectProvider>
              </FormGroup>
            </div>

            <hr />

            <div className="three-column-layout">
              <div className="config-column">
                <FormGroup>
                  <FormLabel name="number-of-teams">Number of Teams</FormLabel>
                  <FormInput
                    name="number-of-teams"
                    type="number"
                    min="2"
                    value={numberOfTeams.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 2;
                      setNumberOfTeams(Math.max(2, value));
                    }}
                  />
                </FormGroup>

                {(config.teamNames || []).map((team, index) => (
                  <FormGroup key={`team-${index}`}>
                    <FormLabel name={`team-${index}`}>Team {index + 1}</FormLabel>
                    <FormInput
                      name={`team-${index}`}
                      type="text"
                      value={team}
                      onChange={(e) => {
                        const newTeams = [...(config.teamNames || [])];
                        newTeams[index] = e.target.value;
                        setConfig((prev) => ({ ...prev, teamNames: newTeams }));
                      }}
                    />
                  </FormGroup>
                ))}
              </div>

              <div className="config-column">
                <FormGroup>
                  <FormLabel name="free-turn-duration">Free Turn Duration</FormLabel>
                  <FormInput
                    name="free-turn-duration"
                    type="number"
                    min="10"
                    max="300"
                    value={config.freeTurnDuration.toString()}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        freeTurnDuration: parseInt(e.target.value) || 30,
                      }))
                    }
                  />
                </FormGroup>

                {(config.nthTurnDurations || []).map((duration, index) => {
                  const teamName = (config.teamNames || [])[index] || `team-${index}`;
                  return (
                    <FormGroup key={`duration-${index}`}>
                      <FormLabel name={`turn-duration-${index}`}>Turn {index + 1} Duration</FormLabel>
                      <FormInput
                        name={`turn-duration-${index}`}
                        type="number"
                        min="10"
                        max="300"
                        value={duration.toString()}
                        onChange={(e) => {
                          const newDurations = [...(config.nthTurnDurations || [])];
                          newDurations[index] = parseInt(e.target.value) || 60;
                          setConfig((prev) => ({ ...prev, nthTurnDurations: newDurations }));
                        }}
                      />
                    </FormGroup>
                  );
                })}
              </div>

              <div className="config-column">
                <FormGroup>
                  <FormLabel name="free-turn-score">Free Turn Score</FormLabel>
                  <FormInput
                    name="free-turn-score"
                    type="number"
                    step="0.5"
                    min="0"
                    value={config.freeTurnScore.toString()}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        freeTurnScore: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </FormGroup>

                {(config.nthTurnScores || []).map((score, index) => {
                  const teamName = (config.teamNames || [])[index] || `team-${index}`;
                  return (
                    <FormGroup key={`score-${index}`}>
                      <FormLabel name={`turn-score-${index}`}>Turn {index + 1} Score</FormLabel>
                      <FormInput
                        name={`turn-score-${index}`}
                        type="number"
                        step="0.5"
                        min="0"
                        value={score.toString()}
                        onChange={(e) => {
                          const newTurnScores = [...(config.nthTurnScores || [])];
                          newTurnScores[index] = parseFloat(e.target.value) || 0;
                          setConfig((prev) => ({
                            ...prev,
                            nthTurnScores: newTurnScores,
                          }));
                        }}
                      />
                    </FormGroup>
                  );
                })}
              </div>
            </div>
          </Form>
        </FormProvider>
      </section>
    </div>
  );
}

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
}

function ConfigModalContent({ onClose }: { onClose: () => void }) {
  return (
    <Dialog className="config-modal-dialog" modal>
      <DialogHeading className="config-modal-heading">Game Configuration</DialogHeading>
      <ConfigDialogContent />
      <div className="config-modal-actions">
        <DialogDismiss className="config-modal-close-btn" onClick={onClose}>
          Close
        </DialogDismiss>
      </div>
    </Dialog>
  );
}

export function ConfigDialog() {
  return (
    <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
      <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={false} defaultValue={null}>
        <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={true} defaultValue={initialGameStatus}>
          <ConfigDialogContent />
        </StorageProvider>
      </StorageProvider>
    </StorageProvider>
  );
}

export function ConfigModal({ open, onClose }: ConfigModalProps) {
  console.log('ConfigModal rendered, open:', open);
  return (
    <DialogProvider open={open} setOpen={(isOpen) => { 
      console.log('DialogProvider setOpen called with:', isOpen);
      if (!isOpen) onClose(); 
    }}>
      <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
        <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={false} defaultValue={null}>
          <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={true} defaultValue={initialGameStatus}>
            <ConfigModalContent onClose={onClose} />
          </StorageProvider>
        </StorageProvider>
      </StorageProvider>
    </DialogProvider>
  );
}
