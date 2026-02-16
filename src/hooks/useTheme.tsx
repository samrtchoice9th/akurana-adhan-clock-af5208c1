import { useState, useEffect, useCallback, createContext, useContext, ReactNode, CSSProperties } from 'react';

export type ThemeColor =
  | 'black-gold'
  | 'mocha-stone'
  | 'olive-ash'
  | 'concrete-dusk'
  | 'plum-shadow'
  | 'espresso-black';
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
const defaultPrefs: ThemePrefs = { color: 'black-gold', style: 'modern' };

function isThemeColor(value: unknown): value is ThemeColor {
  return ['black-gold', 'mocha-stone', 'olive-ash', 'concrete-dusk', 'plum-shadow', 'espresso-black'].includes(String(value));
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
  'mocha-stone': {
    '--background': '30 5% 7%', '--foreground': '33 19% 88%',
    '--card': '24 9% 11%', '--card-foreground': '33 19% 88%',
    '--popover': '24 9% 11%', '--popover-foreground': '33 19% 88%',
    '--primary': '27 28% 43%', '--primary-foreground': '0 0% 100%',
    '--secondary': '27 20% 33%', '--secondary-foreground': '0 0% 100%',
    '--muted': '24 8% 18%', '--muted-foreground': '30 8% 66%',
    '--accent': '27 28% 43%', '--accent-foreground': '0 0% 100%',
    '--border': '24 10% 20%', '--input': '24 10% 20%',
    '--ring': '27 28% 43%',
  },
  'olive-ash': {
    '--background': '90 10% 8%', '--foreground': '86 13% 90%',
    '--card': '90 9% 13%', '--card-foreground': '86 13% 90%',
    '--popover': '90 9% 13%', '--popover-foreground': '86 13% 90%',
    '--primary': '79 20% 40%', '--primary-foreground': '0 0% 100%',
    '--secondary': '80 14% 32%', '--secondary-foreground': '0 0% 100%',
    '--muted': '90 8% 19%', '--muted-foreground': '88 8% 62%',
    '--accent': '79 20% 40%', '--accent-foreground': '0 0% 100%',
    '--border': '90 9% 22%', '--input': '90 9% 22%',
    '--ring': '79 20% 40%',
  },
  'concrete-dusk': {
    '--background': '0 0% 7%', '--foreground': '0 0% 95%',
    '--card': '0 0% 11%', '--card-foreground': '0 0% 95%',
    '--popover': '0 0% 11%', '--popover-foreground': '0 0% 95%',
    '--primary': '60 3% 47%', '--primary-foreground': '0 0% 100%',
    '--secondary': '0 0% 38%', '--secondary-foreground': '0 0% 100%',
    '--muted': '0 0% 15%', '--muted-foreground': '0 0% 72%',
    '--accent': '60 3% 47%', '--accent-foreground': '0 0% 100%',
    '--border': '0 0% 19%', '--input': '0 0% 19%',
    '--ring': '60 3% 47%',
  },
  'plum-shadow': {
    '--background': '300 12% 8%', '--foreground': '300 17% 92%',
    '--card': '300 11% 12%', '--card-foreground': '300 17% 92%',
    '--popover': '300 11% 12%', '--popover-foreground': '300 17% 92%',
    '--primary': '326 25% 39%', '--primary-foreground': '0 0% 100%',
    '--secondary': '322 20% 31%', '--secondary-foreground': '0 0% 100%',
    '--muted': '300 9% 18%', '--muted-foreground': '300 6% 69%',
    '--accent': '326 25% 39%', '--accent-foreground': '0 0% 100%',
    '--border': '300 10% 22%', '--input': '300 10% 22%',
    '--ring': '326 25% 39%',
  },
  'espresso-black': {
    '--background': '20 10% 6%', '--foreground': '30 22% 89%',
    '--card': '24 11% 9%', '--card-foreground': '30 22% 89%',
    '--popover': '24 11% 9%', '--popover-foreground': '30 22% 89%',
    '--primary': '23 28% 29%', '--primary-foreground': '0 0% 100%',
    '--secondary': '24 20% 24%', '--secondary-foreground': '0 0% 100%',
    '--muted': '24 10% 16%', '--muted-foreground': '30 7% 62%',
    '--accent': '23 28% 29%', '--accent-foreground': '0 0% 100%',
    '--border': '24 10% 19%', '--input': '24 10% 19%',
    '--ring': '23 28% 29%',
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
