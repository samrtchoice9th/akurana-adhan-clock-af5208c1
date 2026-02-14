import { useState, useCallback } from 'react';

export type LocationOption = 'central' | 'western' | 'eastern';

const STORAGE_KEY = 'akurana-location';

const OFFSETS: Record<LocationOption, number> = {
  central: 0,
  western: 3,
  eastern: -3,
};

export function useLocation() {
  const [location, setLocationState] = useState<LocationOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'western' || stored === 'eastern') return stored;
    } catch {}
    return 'central';
  });

  const setLocation = useCallback((loc: LocationOption) => {
    setLocationState(loc);
    try { localStorage.setItem(STORAGE_KEY, loc); } catch {}
  }, []);

  const offsetMinutes = OFFSETS[location];

  return { location, setLocation, offsetMinutes };
}
