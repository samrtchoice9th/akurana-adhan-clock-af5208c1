import { useState, useEffect, useCallback, createContext, useContext, ReactNode, CSSProperties } from 'react';

export type ThemeColor = 'light' | 'navy' | 'blue-finance' | 'black-gold' | 'teal';
export type DesignStyle = 'modern' | 'classic' | 'glass';

interface ThemePrefs {
  color: ThemeColor;
  style: DesignStyle;
}

interface ThemeContextType extends ThemePrefs {
  isRamadan: boolean;
  setColor: (c: ThemeColor) => void;
  setStyle: (s: DesignStyle) => void;
  setIsRamadan: (v: boolean) => void;
}

const STORAGE_KEY = 'akurana-theme-prefs';
const defaultPrefs: ThemePrefs = { color: 'light', style: 'modern' };

function isThemeColor(value: unknown): value is ThemeColor {
  return ['light', 'navy', 'blue-finance', 'black-gold', 'teal'].includes(String(value));
}

function isDesignStyle(value: unknown): value is DesignStyle {
  return ['modern', 'classic', 'glass'].includes(String(value));
}

function loadPrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;

    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    return {
      color: isThemeColor(parsed.color) ? parsed.color : defaultPrefs.color,
      style: isDesignStyle(parsed.style) ? parsed.style : defaultPrefs.style,
    };
  } catch {
    return defaultPrefs;
  }
}

type CssVariableMap = Record<`--${string}`, string>;

const RAMADAN_VARS: CssVariableMap = {
  '--background': '152 70% 10%',
  '--foreground': '43 20% 90%',
  '--card': '152 50% 13%',
  '--card-foreground': '43 20% 90%',
  '--popover': '152 50% 13%',
  '--popover-foreground': '43 20% 90%',
  '--primary': '43 80% 50%',
  '--primary-foreground': '152 70% 10%',
  '--secondary': '43 60% 40%',
  '--secondary-foreground': '0 0% 100%',
  '--muted': '152 30% 18%',
  '--muted-foreground': '43 15% 55%',
  '--accent': '43 80% 50%',
  '--accent-foreground': '152 70% 10%',
  '--border': '152 25% 20%',
  '--input': '152 25% 20%',
  '--ring': '43 80% 50%',
};

const THEME_VARS: Record<ThemeColor, CssVariableMap> = {
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
  ...defaultPrefs,
  isRamadan: false,
  setColor: () => undefined,
  setStyle: () => undefined,
  setIsRamadan: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(loadPrefs);
  const [isRamadan, setIsRamadan] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setColor = useCallback((color: ThemeColor) => setPrefs((prev) => ({ ...prev, color })), []);
  const setStyle = useCallback((style: DesignStyle) => setPrefs((prev) => ({ ...prev, style })), []);

  const vars = isRamadan ? RAMADAN_VARS : THEME_VARS[prefs.color];
  const styleVars: CSSProperties = { '--radius': STYLE_RADIUS[prefs.style] };

  for (const [key, value] of Object.entries(vars)) {
    styleVars[key as keyof CSSProperties] = value;
  }

  const styleClass = prefs.style === 'glass' ? 'style-glass' : '';

  return (
    <ThemeContext.Provider value={{ ...prefs, isRamadan, setColor, setStyle, setIsRamadan }}>
      <div className={`min-h-screen bg-background text-foreground ${styleClass}`} style={styleVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
