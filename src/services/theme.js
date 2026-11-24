import { DEFAULT_GUIAR_THEME } from '../domain/models';

const THEME_CSS_VARS = {
  '--guiar-primary': 'primaryColor',
  '--guiar-secondary': 'secondaryColor',
  '--guiar-accent': 'accentColor',
  '--guiar-dark': 'darkSurface',
  '--guiar-bg': 'lightBg',
  '--guiar-card': 'cardBg',
  '--guiar-text': 'textPrimary',
  '--guiar-text-secondary': 'textSecondary',
  '--guiar-danger': 'dangerColor',
  '--guiar-warning': 'warningColor',
  '--guiar-success': 'successColor',
  '--guiar-radius': 'radius',
  '--guiar-touch-min': 'minTouchTarget',
};

export function applyGuiarTheme(themeOverrides = {}, targetEl = document.documentElement) {
  const mergedTheme = {
    ...DEFAULT_GUIAR_THEME,
    ...themeOverrides,
  };

  if (targetEl && targetEl.style) {
    Object.entries(THEME_CSS_VARS).forEach(([cssVar, propKey]) => {
      const value = mergedTheme[propKey];
      if (value !== undefined && value !== null) {
        targetEl.style.setProperty(cssVar, String(value));
      }
    });
  }

  return mergedTheme;
}