import {
  Button,
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
import type { Character, GameConfig, GameState } from '../types';
import { fetchCharactersFromGoogleSheet } from '../utils/csvFetcher';
import { initialGameConfig, initialGameState } from '../utils/initialState';
import { STORAGE_KEYS } from '../utils/storageKeys';

function ConfigScreenContent() {
  const { value: gameState } = useStorage<GameState>(STORAGE_KEYS.STATUS);
  const { update: updateConfigStorage } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);
  const { update: updatePeopleStorage } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);

  const [isLoading, setIsLoading] = useState(false);

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    characterCount: number;
    categories: string[];
    difficulties: string[];
  } | null>(null);

  // Initialize from localStorage directly, not from storage context
  // This prevents circular updates
  const [loadedCharacters, setLoadedCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PEOPLE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
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
    const initialConfig = gameState?.config || initialGameConfig;
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

  // Persist loadedCharacters to localStorage on every change
  const lastSavedPeopleRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (loadedCharacters.length > 0) {
      const peopleString = JSON.stringify(loadedCharacters);
      // Only update if characters actually changed
      if (lastSavedPeopleRef.current !== peopleString) {
        lastSavedPeopleRef.current = peopleString;
        updatePeopleStorage(loadedCharacters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedCharacters, updatePeopleStorage]);

  // Restore validation status if characters are already loaded
  useEffect(() => {
    if (loadedCharacters.length > 0) {
      const characters = loadedCharacters;
      const categories = [...new Set(characters.map((c) => c.category))].sort();
      const difficulties = [...new Set(characters.map((c) => c.difficulty))].sort();

      setValidationStatus({
        isValid: true,
        characterCount: characters.length,
        categories,
        difficulties,
      });
    } else if (gameState?.characters && gameState.characters.length > 0) {
      // Fallback to gameState.characters if loadedCharacters is empty
      const characters = gameState.characters;
      setLoadedCharacters(characters);
      const categories = [...new Set(characters.map((c) => c.category))].sort();
      const difficulties = [...new Set(characters.map((c) => c.difficulty))].sort();

      setValidationStatus({
        isValid: true,
        characterCount: characters.length,
        categories,
        difficulties,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.characters, loadedCharacters]); // Only run on mount

  const handleUrlChange = (url: string) => {
    setConfig((prev) => ({ ...prev, googleSheetUrl: url }));
    // Clear validation status and saved characters when URL changes
    if (!url) {
      setValidationStatus(null);
      setLoadedCharacters([]);
      // Clear saved characters from localStorage
      updatePeopleStorage([]);
    }
  };

  const handleLoadSheet = async () => {
    const url = config.googleSheetUrl;
    if (!url || !url.includes('docs.google.com/spreadsheets')) {
      alert('Invalid URL\n\nPlease enter a valid Google Sheets URL.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchCharactersFromGoogleSheet(url);

      if (result.success && result.data) {
        const characters = result.data;
        setLoadedCharacters(characters);
        const categories = [...new Set(characters.map((c) => c.category))].sort();
        const difficulties = [...new Set(characters.map((c) => c.difficulty))].sort();

        setValidationStatus({
          isValid: true,
          characterCount: characters.length,
          categories,
          difficulties,
        });

        // Set defaults to all selected
        setConfig((prev) => ({
          ...prev,
          selectedCategories: categories,
          selectedDifficulties: difficulties,
        }));

        alert(
          `Data Loaded Successfully\n\nLoaded ${characters.length} characters with ${categories.length} categories and ${difficulties.length} difficulty levels.`,
        );
      } else {
        alert(`Failed to Load Data\n\n${result.error || 'Failed to load data from the Google Sheet.'}`);
      }
    } catch (err) {
      alert(`Error\n\n${err instanceof Error ? err.message : 'An unknown error occurred.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="configuration-screen">
      <section className="config-section">
        <FormProvider>
          <Form>
            <FormGroup>
              <FormLabel name="sheet-url">Google Sheet URL</FormLabel>
              <div className="url-input-group">
                <FormInput
                  name="sheet-url"
                  type="url"
                  value={config.googleSheetUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={isLoading}
                />
                <Button className="reload-btn" onClick={handleLoadSheet} disabled={isLoading || !config.googleSheetUrl}>
                  {isLoading ? 'Loading...' : 'Load'}
                </Button>
              </div>
            </FormGroup>

            <hr />

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
                  <FormGroup key={`team-${team}`}>
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
                    <FormGroup key={`duration-${teamName}`}>
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
                    <FormGroup key={`score-${teamName}`}>
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

export function ConfigScreen() {
  return (
    <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
      <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={false} defaultValue={null}>
        <StorageProvider<GameState> storageKey={STORAGE_KEYS.STATUS} readOnly={true} defaultValue={initialGameState}>
          <ConfigScreenContent />
        </StorageProvider>
      </StorageProvider>
    </StorageProvider>
  );
}
