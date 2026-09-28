import {
  measureUnitsOf,
  type MeasureUnits,
  type UnitPreference,
} from "@eli-coach-platform/domain/unit-preference";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

type UnitPreferenceState = {
  preference: UnitPreference;
  choosePreference: (preference: UnitPreference) => void;
};

type UnitPreferenceStore = StoreApi<UnitPreferenceState>;

function createUnitPreferenceStore(
  preference: UnitPreference,
): UnitPreferenceStore {
  return createStore<UnitPreferenceState>()((set) => ({
    preference,
    choosePreference: (chosen) => set({ preference: chosen }),
  }));
}

const UnitPreferenceContext = createContext<UnitPreferenceStore | null>(null);

type UnitPreferenceProviderProps = PropsWithChildren<{
  preference: UnitPreference;
}>;

export function UnitPreferenceProvider({
  children,
  preference,
}: UnitPreferenceProviderProps) {
  const [store] = useState(() => createUnitPreferenceStore(preference));

  return (
    <UnitPreferenceContext.Provider value={store}>
      {children}
    </UnitPreferenceContext.Provider>
  );
}

export function useUnitPreference<Selected>(
  selector: (state: UnitPreferenceState) => Selected,
): Selected {
  const store = useContext(UnitPreferenceContext);

  if (!store) {
    throw new Error(
      "useUnitPreference must be used within UnitPreferenceProvider.",
    );
  }

  return useStore(store, selector);
}

export function useMeasureUnits(): MeasureUnits {
  const preference = useUnitPreference((state) => state.preference);

  return useMemo(() => measureUnitsOf(preference), [preference]);
}
