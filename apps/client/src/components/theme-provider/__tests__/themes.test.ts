import { describe, expect, test } from 'bun:test';
import { contrast, getThemeVariables, THEMES } from '../themes';

describe('built-in theme catalog', () => {
  test('Miku uses a turquoise selection instead of a neutral gray highlight', () => {
    const theme = THEMES.find((item) => item.id === 'hatsune-miku')!;
    const variables = getThemeVariables(theme);
    expect(variables['--accent']).toBe('#163d43');
    expect(
      contrast(variables['--foreground']!, variables['--accent']!)
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('Miku maps the rail and raised surfaces to the dock palette', () => {
    const theme = THEMES.find((item) => item.id === 'hatsune-miku')!;
    const variables = getThemeVariables(theme);
    expect(theme.rail).toBe('#101418');
    expect(theme.raised).toBe('#303b43');
    expect(variables['--rail']).toBe('#101418');
    expect(variables['--raised']).toBe('#303b43');
  });

  test('themes without dock surfaces keep the nav and border fallbacks', () => {
    const theme = THEMES.find((item) => item.id === 'ryuko')!;
    const variables = getThemeVariables(theme);
    expect(theme.rail).toBeUndefined();
    expect(theme.raised).toBeUndefined();
    expect(variables['--rail']).toBe(theme.nav);
    expect(variables['--raised']).toBe(theme.border);
  });

  test('keeps body text, muted text and action labels readable in every adapted palette', () => {
    for (const theme of THEMES.filter((item) => item.source !== 'dodecagon')) {
      const variables = getThemeVariables(theme);
      for (const token of [
        '--foreground',
        '--muted-foreground',
        '--accent-text'
      ]) {
        for (const surface of ['--background', '--card', '--secondary']) {
          expect(
            contrast(variables[token]!, variables[surface]!),
            `${theme.id} ${token} on ${surface}`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(
        contrast(variables['--primary']!, variables['--primary-foreground']!),
        theme.id
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(
          variables['--sidebar-primary']!,
          variables['--sidebar-primary-foreground']!
        ),
        theme.id
      ).toBeGreaterThanOrEqual(4.5);
      for (const value of Object.values(variables))
        expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('includes all 102 Oh My Pi palettes without colliding with Dodecagon defaults', () => {
    const imported = THEMES.filter((theme) => theme.source === 'omp');
    expect(imported).toHaveLength(102);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(106);
    expect(imported.filter((theme) => theme.mode === 'dark')).toHaveLength(54);
    expect(imported.filter((theme) => theme.mode === 'light')).toHaveLength(48);
    expect(
      imported.find((theme) => theme.id === 'omp-dark-tokyo-night')
    ).toMatchObject({ bg: '#1a1b26', accent: '#bb9af7' });
  });
});
