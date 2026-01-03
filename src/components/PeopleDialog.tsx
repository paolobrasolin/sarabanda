import {
  Button,
  Dialog,
  DialogDismiss,
  DialogHeading,
  DialogProvider,
  Form,
  FormGroup,
  FormInput,
  FormProvider,
} from '@ariakit/react';
import React, { useEffect, useState } from 'react';
import { StorageProvider, useStorage } from '../hooks/useStorage';
import type { Character, GameConfig, GameStatus } from '../types';
import { fetchCharactersFromGoogleSheet } from '../utils/csvFetcher';
import { createCharacterId, getPropKeys, snakeCaseToDisplayName } from '../utils/gameHelpers';
import { initialGameConfig, initialGameStatus } from '../utils/initialState';
import { STORAGE_KEYS } from '../utils/storageKeys';

interface PeopleDialogProps {
  open: boolean;
  onClose: () => void;
}

function PeopleDialogContent({ onClose }: { onClose: () => void }) {
  const { update: updateConfigStorage } = useStorage<GameConfig>(STORAGE_KEYS.CONFIG);
  const { update: updatePeopleStorage } = useStorage<Character[]>(STORAGE_KEYS.PEOPLE);
  const { value: gameStatus, update: updateGameStatus } = useStorage<GameStatus>(STORAGE_KEYS.STATUS);

  const [isLoading, setIsLoading] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved) as GameConfig;
        return parsed.googleSheetUrl || '';
      }
    } catch {
      // Fall through
    }
    return '';
  });

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    characterCount: number;
    categories: string[];
    difficulties: string[];
  } | null>(null);

  // Initialize from localStorage directly
  const [loadedCharacters, setLoadedCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PEOPLE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedCharacters]);

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

  // Persist googleSheetUrl to config when it changes
  useEffect(() => {
    const configString = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (configString) {
      try {
        const config = JSON.parse(configString) as GameConfig;
        if (config.googleSheetUrl !== googleSheetUrl) {
          updateConfigStorage({ ...config, googleSheetUrl });
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleSheetUrl]);

  const handleUrlChange = (url: string) => {
    setGoogleSheetUrl(url);
    // Clear validation status and saved characters when URL changes
    if (!url) {
      setValidationStatus(null);
      setLoadedCharacters([]);
      // Clear saved characters from localStorage
      updatePeopleStorage([]);
    }
  };

  const handleLoadSheet = async () => {
    if (!googleSheetUrl || !googleSheetUrl.includes('docs.google.com/spreadsheets')) {
      alert('Invalid URL\n\nPlease enter a valid Google Sheets URL.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchCharactersFromGoogleSheet(googleSheetUrl);

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

        // Update config with URL and reset selected categories/difficulties to all available
        const configString = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (configString) {
          try {
            const config = JSON.parse(configString) as GameConfig;
            updateConfigStorage({
              ...config,
              googleSheetUrl,
              selectedCategories: categories,
              selectedDifficulties: difficulties,
            });
          } catch {
            // Ignore parse errors
          }
        }

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

  const handleResetUsedCharacters = () => {
    if (!gameStatus) return;

    if (window.confirm('Are you sure you want to reset all used characters? This will mark all characters as available again.')) {
      updateGameStatus({
        ...gameStatus,
        usedCharacters: [],
      });
    }
  };

  // Check if a character is used
  const isCharacterUsed = (character: Character): boolean => {
    if (!gameStatus) return false;
    const characterId = createCharacterId(character);
    return gameStatus.usedCharacters.includes(characterId);
  };

  // Count used characters
  const usedCount = loadedCharacters.filter((char) => isCharacterUsed(char)).length;

  return (
    <Dialog className="people-modal-dialog" modal>
      <DialogHeading className="people-modal-heading">Load Characters</DialogHeading>
      <div className="people-modal-content">
        <FormProvider>
          <Form>
            <FormGroup>
              <div className="url-input-group">
                <FormInput
                  name="sheet-url"
                  type="url"
                  value={googleSheetUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={isLoading}
                />
                <Button
                  className="reload-btn"
                  onClick={handleLoadSheet}
                  disabled={isLoading || !googleSheetUrl}
                >
                  {isLoading ? 'Loading...' : 'Load'}
                </Button>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Paste the URL of a <b>public</b> Google Sheets spreadsheet. Need an example? Try the{' '}
                <a
                  href="https://docs.google.com/spreadsheets/d/1rWnPIhtC1fst8CVDIdRgIgSnES79qoktpQGyqlp7TGA/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                >
                  demo spreadsheet
                </a>
                .
              </div>
            </FormGroup>

            {validationStatus && loadedCharacters.length > 0 && (
              <div className="loaded-data-section">
                <h3>
                  Loaded Data ({validationStatus.characterCount} characters, {validationStatus.categories.length}{' '}
                  categories, {validationStatus.difficulties.length} difficulties)
                </h3>
                <div className="people-table-container">
                  <table className="people-table">
                    <thead>
                      <tr>
                        {getPropKeys(loadedCharacters).map((propKey) => (
                          <th key={propKey}>{snakeCaseToDisplayName(propKey)}</th>
                        ))}
                        <th>Category</th>
                        <th>Difficulty</th>
                        <th>Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadedCharacters.map((character, index) => {
                        const used = isCharacterUsed(character);
                        const propKeys = getPropKeys(loadedCharacters);
                        return (
                          <tr key={index} className={used ? 'character-used' : ''}>
                            {propKeys.map((propKey) => (
                              <td key={propKey}>{character.props[propKey] || ''}</td>
                            ))}
                            <td>{character.category}</td>
                            <td>{character.difficulty}</td>
                            <td>{used ? '✓' : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Form>
        </FormProvider>
      </div>
      <div className="people-modal-actions">
        <Button
          className="reset-used-btn"
          onClick={handleResetUsedCharacters}
          disabled={usedCount === 0}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: usedCount > 0 ? 'var(--accent-tertiary)' : 'var(--bg-secondary)',
            color: usedCount > 0 ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '8px',
            cursor: usedCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            opacity: usedCount > 0 ? 1 : 0.6,
          }}
        >
          Reset Used {usedCount > 0 && `(${usedCount})`}
        </Button>
        <DialogDismiss className="people-modal-close-btn" onClick={onClose}>
          Close
        </DialogDismiss>
      </div>
    </Dialog>
  );
}

export function PeopleDialog({ open, onClose }: PeopleDialogProps) {
  return (
    <DialogProvider
      open={open}
      setOpen={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <StorageProvider<GameConfig> storageKey={STORAGE_KEYS.CONFIG} readOnly={false} defaultValue={initialGameConfig}>
        <StorageProvider<Character[]> storageKey={STORAGE_KEYS.PEOPLE} readOnly={false} defaultValue={null}>
          <StorageProvider<GameStatus> storageKey={STORAGE_KEYS.STATUS} readOnly={false} defaultValue={initialGameStatus}>
            <PeopleDialogContent onClose={onClose} />
          </StorageProvider>
        </StorageProvider>
      </StorageProvider>
    </DialogProvider>
  );
}
