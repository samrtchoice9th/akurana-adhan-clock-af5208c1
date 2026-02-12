import { useState, useEffect, useCallback } from 'react';

export type ThemeColor = 'light' | 'navy' | 'blue-finance' | 'black-gold' | 'teal';
export type DesignStyle = 'modern' | 'classic' | 'glass';

interface ThemePreferences {
  color: ThemeColor;
  style: DesignStyle;
}

const STORAGE_KEY = 'akurana-theme-prefs';
const THEME_CLASSES: ThemeColor[] = ['light', 'navy', 'blue-finance', 'black-gold', 'teal'];
const STYLE_CLASSES: DesignStyle[] = ['modern', 'classic', 'glass'];

const defaultPrefs: ThemePreferences = { color: 'light', style: 'modern' };

function loadPrefs(): ThemePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old theme values
      if (['green', 'blue', 'dark'].includes(parsed.color)) {
        parsed.color = 'light';
      }
      return { ...defaultPrefs, ...parsed };
    }
  } catch {}
  return defaultPrefs;
}

function applyTheme(prefs: ThemePreferences) {
  const root = document.documentElement;
  THEME_CLASSES.forEach(c => root.classList.remove(`theme-${c}`));
  STYLE_CLASSES.forEach(c => root.classList.remove(`style-${c}`));

  if (prefs.color !== 'light') {
    root.classList.add(`theme-${prefs.color}`);
  }
  root.classList.add(`style-${prefs.style}`);
}

export function useTheme() {
  const [prefs, setPrefs] = useState<ThemePreferences>(loadPrefs);

  useEffect(() => {
    applyTheme(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setColor = useCallback((color: ThemeColor) => {
    setPrefs(p => ({ ...p, color }));
  }, []);

  const setStyle = useCallback((style: DesignStyle) => {
    setPrefs(p => ({ ...p, style }));
  }, []);

  return { ...prefs, setColor, setStyle };
}

export function initTheme() {
  const prefs = loadPrefs();
  applyTheme(prefs);
}
