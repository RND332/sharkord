import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react';
import { ThemeContext } from './context';
import { getTheme, getThemeVariables, isThemePreference } from './themes';

const subscribeSystemTheme = (onChange: () => void) => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getSystemDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;
const getServerDark = () => true;

type TThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: LocalStorageKey;
};

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = LocalStorageKey.VITE_UI_THEME
}: TThemeProviderProps) {
  const [theme, setPreference] = useState(() => {
    const stored = getLocalStorageItem(storageKey);
    if (isThemePreference(stored)) return stored;
    return isThemePreference(defaultTheme) ? defaultTheme : 'dark';
  });
  const systemDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemDark,
    getServerDark
  );
  let resolvedId = theme;
  if (theme === 'system') resolvedId = systemDark ? 'dark' : 'light';
  const resolvedTheme = getTheme(resolvedId);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const variables = getThemeVariables(resolvedTheme);
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme.mode);
    root.dataset.theme = resolvedTheme.id;
    root.style.colorScheme = resolvedTheme.mode;
    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value);
    }
    return () => {
      for (const key of Object.keys(variables)) root.style.removeProperty(key);
      root.style.removeProperty('color-scheme');
      root.classList.remove('light', 'dark');
      delete root.dataset.theme;
    };
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (id: string) => {
      if (!isThemePreference(id)) return;
      setLocalStorageItem(storageKey, id);
      setPreference(id);
    },
    [storageKey]
  );
  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
