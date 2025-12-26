import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Generic localStorage provider that syncs with storage events
 * and provides typed read/write access to a specific localStorage key.
 *
 * Usage:
 * ```tsx
 * <StorageProvider<GameState>
 *   storageKey="sarabanda_status"
 *   readOnly={false}
 *   defaultValue={initialGameState}
 * >
 *   <YourComponent />
 * </StorageProvider>
 * ```
 */

interface StorageProviderProps<T> {
  storageKey: string;
  readOnly?: boolean;
  defaultValue?: T | null;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  children: ReactNode;
}

interface StorageContextValue<T> {
  value: T | null;
  update: (value: T) => void;
  clear: () => void;
  readOnly: boolean;
}

// Create a context factory that stores contexts by storage key
const contexts = new Map<string, React.Context<StorageContextValue<unknown> | undefined>>();

function getContext<T>(storageKey: string): React.Context<StorageContextValue<T> | undefined> {
  if (!contexts.has(storageKey)) {
    contexts.set(storageKey, createContext<StorageContextValue<T> | undefined>(undefined));
  }
  const context = contexts.get(storageKey);
  if (!context) {
    throw new Error(`Failed to get context for storage key: ${storageKey}`);
  }
  return context as React.Context<StorageContextValue<T> | undefined>;
}

export function StorageProvider<T>({
  storageKey,
  readOnly = false,
  defaultValue = null,
  serialize = (value) => JSON.stringify(value),
  deserialize = (value) => JSON.parse(value) as T,
  children,
}: StorageProviderProps<T>) {
  const [value, setValue] = useState<T | null>(() => {
    // Load initial value from localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return deserialize(saved);
      }
    } catch (error) {
      console.error(`Failed to load ${storageKey} from localStorage:`, error);
    }
    return defaultValue;
  });

  // Load from localStorage on mount (in case it was set before component mounted)
  // This only runs once on mount, initial state already loaded the value
  // So we don't need to do anything here - the initial useState already handled it

  // Listen to storage events (cross-tab updates)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        if (e.newValue) {
          try {
            const parsed = deserialize(e.newValue);
            setValue(parsed);
          } catch (error) {
            console.error(`Failed to parse ${storageKey} from storage event:`, error);
          }
        } else {
          // Key was deleted
          setValue(defaultValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll localStorage periodically as a fallback
    // (storage events don't fire in the same tab, but this is mainly for cross-tab scenarios)
    // Note: In normal usage, storage events should handle cross-tab updates.
    // Polling is a safety net for edge cases.
    const pollInterval = setInterval(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = deserialize(saved);
          setValue((prev) => {
            // Only update if the serialized value actually changed
            const prevString = prev ? serialize(prev) : null;
            const newString = serialize(parsed);
            if (prevString !== newString) {
              return parsed;
            }
            return prev;
          });
        } else {
          setValue((prev) => {
            if (prev !== defaultValue) {
              return defaultValue;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error(`Failed to poll ${storageKey} from localStorage:`, error);
      }
    }, 1000); // Poll every 1 second

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [storageKey, defaultValue, deserialize, serialize]);

  const update = useCallback(
    (newValue: T) => {
      if (readOnly) {
        console.warn(`Attempted to update read-only storage key: ${storageKey}`);
        return;
      }

      try {
        const newValueString = serialize(newValue);

        // Check current value from localStorage to avoid unnecessary updates
        const currentSaved = localStorage.getItem(storageKey);
        if (currentSaved === newValueString) {
          // Value hasn't changed, skip update
          return;
        }

        // Update context state immediately (for same-tab reactivity)
        setValue(newValue);
        // Save to localStorage (will trigger storage event for other tabs)
        localStorage.setItem(storageKey, newValueString);
      } catch (error) {
        console.error(`Failed to update ${storageKey} in localStorage:`, error);
      }
    },
    [readOnly, storageKey, serialize],
  );

  const clear = useCallback(() => {
    if (readOnly) {
      console.warn(`Attempted to clear read-only storage key: ${storageKey}`);
      return;
    }

    try {
      // Update context state immediately
      setValue(defaultValue);
      // Remove from localStorage
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Failed to clear ${storageKey} from localStorage:`, error);
    }
  }, [readOnly, storageKey, defaultValue]);

  // Use a context that's specific to this storage key
  const Context = getContext<T>(storageKey);

  const contextValue: StorageContextValue<T> = {
    value,
    update,
    clear,
    readOnly,
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

/**
 * Hook to use a storage provider
 * Must be used within a StorageProvider with matching storageKey
 *
 * Usage:
 * ```tsx
 * const { value, update, clear } = useStorage<GameState>("sarabanda_status");
 * ```
 */
export function useStorage<T>(storageKey: string): StorageContextValue<T> {
  const Context = getContext<T>(storageKey);
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error(`useStorage must be used within a StorageProvider with storageKey="${storageKey}"`);
  }

  return context;
}
