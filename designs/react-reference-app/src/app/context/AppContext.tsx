import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';

export type PrototypeWaitlistAvailability =
  | 'available'
  | 'limited'
  | 'closed'
  | null;

type AppState = {
  role: 'visitor' | 'client' | 'coach';
  isAuthenticated: boolean;
  hasBundle: boolean;
  isWaitlistMode: boolean;
  needsOnboarding: boolean;
  nutritionBlockCompleted: boolean;
  nutritionPreferenceConflict: boolean;
  waitlistAvailability: PrototypeWaitlistAvailability;
  isStoreCatalogEmpty: boolean;
  storeCheckoutOutcome: PrototypeStoreCheckoutOutcome;
  isDownloadUnavailable: boolean;
};

type AppContextType = {
  appState: AppState;
  setAppState: (state: Partial<AppState>) => void;
};

const defaultState: AppState = {
  role: 'visitor',
  isAuthenticated: false,
  hasBundle: false,
  isWaitlistMode: false,
  needsOnboarding: false,
  nutritionBlockCompleted: false,
  nutritionPreferenceConflict: false,
  waitlistAvailability: 'available',
  isStoreCatalogEmpty: false,
  storeCheckoutOutcome: 'success',
  isDownloadUnavailable: false,
};

const validRoles = ['visitor', 'client', 'coach'] as const;
const validWaitlistAvailabilities = ['available', 'limited', 'closed'] as const;
const validStoreCheckoutOutcomes = [
  'success',
  'bot-rejected',
  'delivery-failure',
  'server-error',
  'unavailable-product',
] as const;

function parseDevParamsFromURL(): AppState {
  const params = new URLSearchParams(window.location.search);
  const state = { ...defaultState };

  const role = params.get('role');
  if (role && (validRoles as readonly string[]).includes(role)) {
    state.role = role as AppState['role'];
  }
  if (params.has('auth')) state.isAuthenticated = params.get('auth') === '1';
  if (params.has('bundle')) state.hasBundle = params.get('bundle') === '1';
  if (params.has('waitlist')) state.isWaitlistMode = params.get('waitlist') === '1';
  if (params.has('nblock')) state.nutritionBlockCompleted = params.get('nblock') === '1';
  if (params.has('npref')) state.nutritionPreferenceConflict = params.get('npref') === '1';
  const availability = params.get('availability');
  if (
    availability &&
    (validWaitlistAvailabilities as readonly string[]).includes(availability)
  ) {
    state.waitlistAvailability =
      availability as Exclude<PrototypeWaitlistAvailability, null>;
  } else if (availability === 'unavailable') {
    state.waitlistAvailability = null;
  }
  if (params.has('storeempty')) {
    state.isStoreCatalogEmpty = params.get('storeempty') === '1';
  }
  const checkout = params.get('checkout');
  if (
    checkout &&
    (validStoreCheckoutOutcomes as readonly string[]).includes(checkout)
  ) {
    state.storeCheckoutOutcome = checkout as PrototypeStoreCheckoutOutcome;
  }
  if (params.has('download')) {
    state.isDownloadUnavailable = params.get('download') === 'unavailable';
  }

  return state;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setFullState] = useState<AppState>(() => parseDevParamsFromURL());
  const location = useLocation();

  const setAppState = (state: Partial<AppState>) => {
    setFullState(prev => ({ ...prev, ...state }));
  };

  useEffect(() => {
    const url = new URL(window.location.href);

    url.searchParams.delete('role');
    url.searchParams.delete('auth');
    url.searchParams.delete('bundle');
    url.searchParams.delete('waitlist');
    url.searchParams.delete('nblock');
    url.searchParams.delete('npref');
    url.searchParams.delete('availability');
    url.searchParams.delete('storeempty');
    url.searchParams.delete('checkout');
    url.searchParams.delete('download');

    if (appState.role !== 'visitor') url.searchParams.set('role', appState.role);
    if (appState.isAuthenticated) url.searchParams.set('auth', '1');
    if (appState.hasBundle) url.searchParams.set('bundle', '1');
    if (appState.isWaitlistMode) url.searchParams.set('waitlist', '1');
    if (appState.nutritionBlockCompleted) url.searchParams.set('nblock', '1');
    if (appState.nutritionPreferenceConflict) url.searchParams.set('npref', '1');
    if (appState.waitlistAvailability === null) {
      url.searchParams.set('availability', 'unavailable');
    } else if (appState.waitlistAvailability !== 'available') {
      url.searchParams.set('availability', appState.waitlistAvailability);
    }
    if (appState.isStoreCatalogEmpty) url.searchParams.set('storeempty', '1');
    if (appState.storeCheckoutOutcome !== 'success') {
      url.searchParams.set('checkout', appState.storeCheckoutOutcome);
    }
    if (appState.isDownloadUnavailable) {
      url.searchParams.set('download', 'unavailable');
    }

    const target = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (target !== current) {
      window.history.replaceState(history.state, '', target);
    }
  }, [appState, location.pathname]);

  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
