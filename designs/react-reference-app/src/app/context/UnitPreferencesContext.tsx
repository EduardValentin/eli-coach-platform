import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { WeightUnit, HeightUnit } from '../utils/units';

// ── Types ───────────────────────────────────────────────────────────

interface UnitPreferences {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

interface UnitPreferencesContextType extends UnitPreferences {
  setWeightUnit(unit: WeightUnit): void;
  setHeightUnit(unit: HeightUnit): void;
}

const STORAGE_KEY = 'eli.unitPreferences';

// Default to metric (kg / cm) — the coach and clients are Romanian, so this is
// the expected baseline; a client can switch to imperial in Settings.
const DEFAULTS: UnitPreferences = { weightUnit: 'kg', heightUnit: 'cm' };

function loadPreferences(): UnitPreferences {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UnitPreferences>;
    return {
      weightUnit: parsed.weightUnit === 'kg' || parsed.weightUnit === 'lb' ? parsed.weightUnit : DEFAULTS.weightUnit,
      heightUnit: parsed.heightUnit === 'cm' || parsed.heightUnit === 'ft-in' ? parsed.heightUnit : DEFAULTS.heightUnit,
    };
  } catch {
    return DEFAULTS;
  }
}

// ── Context ─────────────────────────────────────────────────────────

const UnitPreferencesContext = createContext<UnitPreferencesContextType | null>(null);

export function UnitPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UnitPreferences>(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore persistence failures (e.g. private mode) */
    }
  }, [prefs]);

  const setWeightUnit = useCallback((weightUnit: WeightUnit) => {
    setPrefs(prev => ({ ...prev, weightUnit }));
  }, []);

  const setHeightUnit = useCallback((heightUnit: HeightUnit) => {
    setPrefs(prev => ({ ...prev, heightUnit }));
  }, []);

  return (
    <UnitPreferencesContext.Provider value={{ ...prefs, setWeightUnit, setHeightUnit }}>
      {children}
    </UnitPreferencesContext.Provider>
  );
}

export function useUnitPreferences() {
  const ctx = useContext(UnitPreferencesContext);
  if (!ctx) throw new Error('useUnitPreferences must be used within UnitPreferencesProvider');
  return ctx;
}
