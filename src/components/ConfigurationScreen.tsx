import {
  Button,
  Form,
  FormDescription,
  FormGroup,
  FormInput,
  FormLabel,
  FormProvider,
  Role,
  Select,
  SelectArrow,
  SelectItem,
  SelectItemCheck,
  SelectLabel,
  SelectPopover,
  SelectProvider,
} from '@ariakit/react';
import { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import type { Character, GameConfig } from '../types';
import { fetchCharactersFromGoogleSheet } from '../utils/csvFetcher';

interface ConfigurationScreenProps {
  onStartGame: () => void;
}

export function ConfigurationScreen({ onStartGame }: ConfigurationScreenProps) {
  const { state, dispatch } = useGame();
  const [isLoading, setIsLoading] = useState(false);

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    characterCount: number;
    categories: string[];
    difficulties: string[];
  } | null>(null);

  const [loadedCharacters, setLoadedCharacters] = useState<Character[]>([]);
  const [config, setConfig] = useState<GameConfig>(() => {
    // Ensure arrays are properly sized on initialization
    const initialConfig = state.config;
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
  const [numberOfTeams, setNumberOfTeams] = useState(state.config.teamNames?.length || 2);
  const [numberOfRounds, setNumberOfRounds] = useState(state.config.numberOfRounds);

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

  // Restore validation status if characters are already loaded
  useEffect(() => {
    if (state.characters.length > 0 && loadedCharacters.length === 0) {
      const characters = state.characters;
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
  }, []); // Only run on mount

  const handleUrlChange = (url: string) => {
    setConfig((prev) => ({ ...prev, googleSheetUrl: url }));
    // Clear validation status when URL changes
    if (!url) {
      setValidationStatus(null);
      setLoadedCharacters([]);
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

  const handleStartGame = () => {
    dispatch({ type: 'SET_CONFIG', payload: config });
    dispatch({ type: 'SET_CHARACTERS', payload: loadedCharacters });
    onStartGame();
  };

  const canStartGame =
    validationStatus?.isValid &&
    (config.teamNames?.length || 0) >= 2 &&
    (config.selectedDifficulties?.length || 0) >= 1 &&
    (config.selectedCategories?.length || 0) >= 1;

  return (
    <div className="configuration-screen">
      <h1>Quiz Game Configuration</h1>

      <section className="config-section" aria-labelledby="sheet-config-heading">
        <FormProvider>
          <Form>
            <FormGroup>
              <FormLabel htmlFor="sheet-url">Google Sheet URL</FormLabel>
              <div className="url-input-group">
                <FormInput
                  id="sheet-url"
                  type="url"
                  value={config.googleSheetUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={isLoading}
                />
                <Button
                  className="reload-btn"
                  onClick={handleLoadSheet}
                  disabled={isLoading || !config.googleSheetUrl}
                  aria-label="Load Google Sheet"
                >
                  {isLoading ? 'Loading...' : 'Load'}
                </Button>
              </div>
            </FormGroup>

            <hr />

            <div className="game-settings-row">
              <FormGroup>
                <FormLabel htmlFor="number-of-rounds">Number of Rounds</FormLabel>
                <FormInput
                  id="number-of-rounds"
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
                  <SelectLabel>Select Difficulties</SelectLabel>
                  <Select className="select-button" required>
                    {!config.selectedDifficulties || config.selectedDifficulties.length === 0
                      ? 'No difficulties selected'
                      : config.selectedDifficulties.length === 1
                        ? config.selectedDifficulties[0]
                        : `${config.selectedDifficulties.length} difficulties selected`}
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
                  <SelectLabel>Select Categories</SelectLabel>
                  <Select className="select-button">
                    {!config.selectedCategories || config.selectedCategories.length === 0
                      ? 'No categories selected'
                      : config.selectedCategories.length === 1
                        ? config.selectedCategories[0]
                        : `${config.selectedCategories.length} categories selected`}
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
                  <FormLabel htmlFor="number-of-teams">Number of Teams</FormLabel>
                  <FormInput
                    id="number-of-teams"
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
                  <FormGroup key={index}>
                    <FormLabel htmlFor={`team-${index}`}>Team {index + 1}</FormLabel>
                    <FormInput
                      id={`team-${index}`}
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
                  <FormLabel htmlFor="free-turn-duration">Free Turn Duration</FormLabel>
                  <FormInput
                    id="free-turn-duration"
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

                {(config.nthTurnDurations || []).map((duration, index) => (
                  <FormGroup key={index}>
                    <FormLabel htmlFor={`turn-duration-${index}`}>Turn {index + 1} Duration</FormLabel>
                    <FormInput
                      id={`turn-duration-${index}`}
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
                ))}
              </div>

              <div className="config-column">
                <FormGroup>
                  <FormLabel htmlFor="free-turn-score">Free Turn Score</FormLabel>
                  <FormInput
                    id="free-turn-score"
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

                {(config.nthTurnScores || []).map((score, index) => (
                  <FormGroup key={index}>
                    <FormLabel htmlFor={`turn-score-${index}`}>Turn {index + 1} Score</FormLabel>
                    <FormInput
                      id={`turn-score-${index}`}
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
                ))}
              </div>
            </div>
          </Form>
        </FormProvider>
      </section>

      <div className="config-actions">
        <Button
          className="start-game-btn"
          onClick={handleStartGame}
          disabled={!canStartGame}
          aria-describedby={!canStartGame ? 'start-game-hint' : undefined}
        >
          Confirm and Play
        </Button>
        {!canStartGame && (
          <div id="start-game-hint" className="start-game-hint" role="alert">
            {!validationStatus?.isValid && 'Please configure a valid Google Sheet URL. '}
            {(config.teamNames?.length || 0) < 2 && 'Please add at least 2 teams. '}
            {(config.selectedDifficulties?.length || 0) < 1 && 'Please select at least one difficulty. '}
            {(config.selectedCategories?.length || 0) < 1 && 'Please select at least one category.'}
          </div>
        )}
      </div>
    </div>
  );
}
