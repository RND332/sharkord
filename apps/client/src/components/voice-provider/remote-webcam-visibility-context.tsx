import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useState,
  type ReactNode
} from 'react';

// Per-remote-user preference: hide this user's webcam video locally.
// Persisted in localStorage so the choice survives reloads.
type THiddenRemoteWebcams = Record<number, true>;

type TRemoteWebcamVisibilityContext = {
  hiddenRemoteWebcams: THiddenRemoteWebcams;
  isWebcamHidden: (userId: number) => boolean;
  setWebcamHidden: (userId: number, hidden: boolean) => void;
  toggleWebcamHidden: (userId: number) => void;
};

const RemoteWebcamVisibilityContext =
  createContext<TRemoteWebcamVisibilityContext | null>(null);

type TRemoteWebcamVisibilityProviderProps = {
  children: ReactNode;
};

const loadHiddenFromStorage = (): THiddenRemoteWebcams => {
  try {
    return (
      getLocalStorageItemAsJSON<THiddenRemoteWebcams>(
        LocalStorageKey.HIDDEN_REMOTE_WEBCAMS
      ) ?? {}
    );
  } catch {
    return {};
  }
};

const saveHiddenToStorage = (hidden: THiddenRemoteWebcams) => {
  try {
    setLocalStorageItemAsJSON(LocalStorageKey.HIDDEN_REMOTE_WEBCAMS, hidden);
  } catch {
    // ignore
  }
};

const RemoteWebcamVisibilityProvider = memo(
  ({ children }: TRemoteWebcamVisibilityProviderProps) => {
    const [hiddenRemoteWebcams, setHiddenRemoteWebcams] =
      useState<THiddenRemoteWebcams>(loadHiddenFromStorage);

    const isWebcamHidden = useCallback(
      (userId: number) => !!hiddenRemoteWebcams[userId],
      [hiddenRemoteWebcams]
    );

    const setWebcamHidden = useCallback((userId: number, hidden: boolean) => {
      setHiddenRemoteWebcams((prev) => {
        const currentlyHidden = !!prev[userId];

        if (hidden === currentlyHidden) return prev;

        const next = { ...prev };

        if (hidden) {
          next[userId] = true;
        } else {
          delete next[userId];
        }

        saveHiddenToStorage(next);

        return next;
      });
    }, []);

    const toggleWebcamHidden = useCallback((userId: number) => {
      setHiddenRemoteWebcams((prev) => {
        const currentlyHidden = !!prev[userId];
        const next = { ...prev };

        if (currentlyHidden) {
          delete next[userId];
        } else {
          next[userId] = true;
        }

        saveHiddenToStorage(next);

        return next;
      });
    }, []);

    return (
      <RemoteWebcamVisibilityContext.Provider
        value={{
          hiddenRemoteWebcams,
          isWebcamHidden,
          setWebcamHidden,
          toggleWebcamHidden
        }}
      >
        {children}
      </RemoteWebcamVisibilityContext.Provider>
    );
  }
);

const useRemoteWebcamVisibility = () => {
  const context = useContext(RemoteWebcamVisibilityContext);

  if (!context) {
    throw new Error(
      'useRemoteWebcamVisibility must be used within RemoteWebcamVisibilityProvider'
    );
  }

  return context;
};

export {
  RemoteWebcamVisibilityContext,
  RemoteWebcamVisibilityProvider,
  useRemoteWebcamVisibility
};
export type { THiddenRemoteWebcams, TRemoteWebcamVisibilityContext };
