import ompPalettes from './omp-palettes.json';

export type TTheme = {
  id: string;
  name: string;
  source: 'dodecagon' | 'personal' | 'omp';
  mode: 'dark' | 'light';
  bg: string;
  nav: string;
  panel: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  secondary?: string;
  sidebarAccent?: string;
  selection?: string;
  rail?: string;
  raised?: string;
};

export const DODECAGON_THEMES: TTheme[] = [
  {
    id: 'dark',
    name: 'Dodecagon Dark',
    source: 'dodecagon',
    mode: 'dark',
    bg: '#313338',
    nav: '#2b2d31',
    panel: '#383a40',
    border: '#44464d',
    fg: '#f2f3f5',
    muted: '#b5bac1',
    accent: '#5865f2'
  },
  {
    id: 'light',
    name: 'Dodecagon Light',
    source: 'dodecagon',
    mode: 'light',
    bg: '#ffffff',
    nav: '#f7f7f8',
    panel: '#f0f1f2',
    border: '#dddddf',
    fg: '#25262b',
    muted: '#6b7280',
    accent: '#3448bf'
  }
];

export const PERSONAL_THEMES: TTheme[] = [
  {
    id: 'ryuko',
    name: 'Ryūko',
    source: 'personal',
    mode: 'dark',
    bg: '#141825',
    nav: '#0c101b',
    panel: '#1f2638',
    border: '#364057',
    fg: '#f4f5fa',
    muted: '#b5bed0',
    accent: '#ff4b60',
    secondary: '#5269ab'
  },
  {
    id: 'hatsune-miku',
    name: 'Hatsune Miku',
    source: 'personal',
    mode: 'dark',
    bg: '#1b2025',
    nav: '#151c22',
    panel: '#282f36',
    border: '#3d4952',
    fg: '#eaf2f5',
    muted: '#b0c2cc',
    accent: '#39c5cf',
    secondary: '#e8488d',
    sidebarAccent: '#e8488d',
    selection: '#163d43',
    rail: '#101418',
    raised: '#303b43'
  }
];

export const OMP_THEMES = ompPalettes as TTheme[];

export const THEMES: TTheme[] = [
  ...DODECAGON_THEMES,
  ...PERSONAL_THEMES,
  ...OMP_THEMES
];

export const getTheme = (id: string): TTheme =>
  THEMES.find((theme) => theme.id === id) ?? DODECAGON_THEMES[0]!;

export const isThemePreference = (value: string | null): value is string =>
  value === 'system' || THEMES.some((theme) => theme.id === value);

export const contrast = (a: string, b: string) => {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => {
      const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

export const getThemeVariables = (theme: TTheme): Record<string, string> => {
  if (theme.source === 'dodecagon') return {};
  const { bg, nav, panel, border, accent, mode } = theme;
  const surfaces = [bg, nav, panel];
  if (theme.selection) surfaces.push(theme.selection);
  const readableForeground = surfaces.every(
    (surface) => contrast(theme.fg, surface) >= 4.5
  );
  let fg = theme.fg;
  if (!readableForeground) fg = mode === 'dark' ? '#ffffff' : '#000000';
  const primaryInk =
    contrast(accent, '#ffffff') > contrast(accent, '#000000')
      ? '#ffffff'
      : '#000000';
  const sidebarAccent = theme.sidebarAccent ?? accent;
  const sidebarInk =
    contrast(sidebarAccent, '#ffffff') > contrast(sidebarAccent, '#000000')
      ? '#ffffff'
      : '#000000';
  const muted = surfaces.every(
    (surface) => contrast(theme.muted, surface) >= 4.5
  )
    ? theme.muted
    : fg;
  const accentText = surfaces.every(
    (surface) => contrast(accent, surface) >= 4.5
  )
    ? accent
    : fg;
  const success = mode === 'dark' ? '#57d18a' : '#247044';
  const danger = mode === 'dark' ? '#f5858f' : '#b3263e';
  return {
    '--background': bg,
    '--foreground': fg,
    '--card': nav,
    '--card-foreground': fg,
    '--popover': nav,
    '--popover-foreground': fg,
    '--primary': accent,
    '--primary-foreground': primaryInk,
    '--secondary': panel,
    '--secondary-foreground': fg,
    '--muted': panel,
    '--muted-foreground': muted,
    '--accent': theme.selection ?? border,
    '--accent-foreground': fg,
    '--destructive': danger,
    '--border': border,
    '--input': muted,
    '--ring': accentText,
    '--chart-1': accent,
    '--chart-2': success,
    '--chart-3': muted,
    '--chart-4': danger,
    '--chart-5': theme.secondary ?? accent,
    '--sidebar': nav,
    '--sidebar-foreground': fg,
    '--sidebar-primary': sidebarAccent,
    '--sidebar-primary-foreground': sidebarInk,
    '--sidebar-accent': theme.selection ?? panel,
    '--sidebar-accent-foreground': fg,
    '--sidebar-border': border,
    '--sidebar-ring': accentText,
    '--rail': theme.rail ?? nav,
    '--theme-secondary': theme.secondary ?? accent,
    '--nav': nav,
    '--canvas': bg,
    '--panel': panel,
    '--raised': theme.raised ?? border,
    '--line': border,
    '--subtle-foreground': muted,
    '--success': success,
    '--control-border': muted,
    '--danger-solid': '#b3263e',
    '--success-solid': '#248046',
    '--accent-text': accentText,
    '--input-surface': nav,
    '--scrollbar-track': nav,
    '--scrollbar-thumb': border,
    '--scrollbar-thumb-hover': muted
  };
};
