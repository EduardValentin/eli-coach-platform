import {
  measureUnitsOf,
  type MeasureUnits,
  type UnitPreferenceSnapshot,
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
  preference: UnitPreferenceSnapshot;
  choosePreference: (preference: UnitPreferenceSnapshot) => void;
};

type UnitPreferenceStore = StoreApi<UnitPreferenceState>;

function createUnitPreferenceStore(
  preference: UnitPreferenceSnapshot,
): UnitPreferenceStore {
  return createStore<UnitPreferenceState>()((set) => ({
    preference,
    choosePreference: (chosen) => set({ preference: chosen }),
  }));
}

const UnitPreferenceContext = createContext<UnitPreferenceStore | null>(null);

type UnitPreferenceProviderProps = PropsWithChildren<{
  preference: UnitPreferenceSnapshot;
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
