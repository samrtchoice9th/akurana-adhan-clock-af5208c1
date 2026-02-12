import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export type ThemeColor = 'light' | 'navy' | 'blue-finance' | 'black-gold' | 'teal';
export type DesignStyle = 'modern' | 'classic' | 'glass';

interface ThemeContextType {
  color: ThemeColor;
  style: DesignStyle;
  setColor: (c: ThemeColor) => void;
  setStyle: (s: DesignStyle) => void;
}

const STORAGE_KEY = 'akurana-theme-prefs';
const defaultPrefs = { color: 'light' as ThemeColor, style: 'modern' as DesignStyle };

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (['green', 'blue', 'dark'].includes(parsed.color)) parsed.color = 'light';
      return { ...defaultPrefs, ...parsed };
    }
  } catch {}
  return defaultPrefs;
}

const THEME_VARS: Record<ThemeColor, Record<string, string>> = {
  light: {},
  navy: {
    '--background': '222 47% 6%', '--foreground': '210 20% 92%',
    '--card': '222 40% 10%', '--card-foreground': '210 20% 92%',
    '--popover': '222 40% 10%', '--popover-foreground': '210 20% 92%',
    '--primary': '210 80% 65%', '--primary-foreground': '222 47% 6%',
    '--secondary': '210 60% 50%', '--secondary-foreground': '0 0% 100%',
    '--muted': '222 30% 16%', '--muted-foreground': '215 15% 55%',
    '--accent': '210 80% 65%', '--accent-foreground': '222 47% 6%',
    '--border': '222 25% 18%', '--input': '222 25% 18%',
    '--ring': '210 80% 65%',
  },
  'blue-finance': {
    '--background': '220 20% 97%', '--foreground': '222 30% 12%',
    '--card': '0 0% 100%', '--card-foreground': '222 30% 12%',
    '--popover': '0 0% 100%', '--popover-foreground': '222 30% 12%',
    '--primary': '224 76% 48%', '--primary-foreground': '0 0% 100%',
    '--secondary': '220 60% 35%', '--secondary-foreground': '0 0% 100%',
    '--muted': '220 15% 91%', '--muted-foreground': '220 10% 42%',
    '--accent': '224 76% 48%', '--accent-foreground': '0 0% 100%',
    '--border': '220 15% 86%', '--input': '220 15% 86%',
    '--ring': '224 76% 48%',
  },
  'black-gold': {
    '--background': '0 0% 2%', '--foreground': '40 20% 90%',
    '--card': '0 0% 7%', '--card-foreground': '40 20% 90%',
    '--popover': '0 0% 7%', '--popover-foreground': '40 20% 90%',
    '--primary': '43 75% 46%', '--primary-foreground': '0 0% 0%',
    '--secondary': '38 60% 38%', '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 13%', '--muted-foreground': '40 10% 50%',
    '--accent': '43 75% 46%', '--accent-foreground': '0 0% 0%',
    '--border': '40 10% 16%', '--input': '40 10% 16%',
    '--ring': '43 75% 46%',
  },
  teal: {
    '--background': '170 20% 97%', '--foreground': '170 20% 10%',
    '--card': '0 0% 100%', '--card-foreground': '170 20% 10%',
    '--popover': '0 0% 100%', '--popover-foreground': '170 20% 10%',
    '--primary': '168 76% 36%', '--primary-foreground': '0 0% 100%',
    '--secondary': '160 60% 40%', '--secondary-foreground': '0 0% 100%',
    '--muted': '170 15% 91%', '--muted-foreground': '170 10% 40%',
    '--accent': '168 76% 36%', '--accent-foreground': '0 0% 100%',
    '--border': '170 15% 86%', '--input': '170 15% 86%',
    '--ring': '168 76% 36%',
  },
};

const STYLE_RADIUS: Record<DesignStyle, string> = {
  modern: '0.75rem',
  classic: '0.25rem',
  glass: '1rem',
};

const ThemeContext = createContext<ThemeContextType>({
  ...defaultPrefs, setColor: () => {}, setStyle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setColor = useCallback((color: ThemeColor) => setPrefs(p => ({ ...p, color })), []);
  const setStyle = useCallback((style: DesignStyle) => setPrefs(p => ({ ...p, style })), []);

  const vars = THEME_VARS[prefs.color];
  const styleVars: React.CSSProperties = { '--radius': STYLE_RADIUS[prefs.style] } as any;
  Object.entries(vars).forEach(([k, v]) => { (styleVars as any)[k] = v; });

  const styleClass = prefs.style === 'glass' ? 'style-glass' : '';

  return (
    <ThemeContext.Provider value={{ ...prefs, setColor, setStyle }}>
      <div className={`min-h-screen bg-background text-foreground ${styleClass}`} style={styleVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function initTheme() {}
