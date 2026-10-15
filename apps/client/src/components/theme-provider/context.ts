import { createContext } from 'react';
import type { TTheme } from './themes';

export type TThemeContext = {
  theme: string;
  resolvedTheme: TTheme;
  setTheme: (id: string) => void;
};

export const ThemeContext = createContext<TThemeContext | undefined>(undefined);
