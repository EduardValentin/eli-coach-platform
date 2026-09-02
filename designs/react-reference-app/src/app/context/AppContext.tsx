import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import type { PrototypeSignInOutcome } from '../services/authService';
import type {
  PrototypeLibraryDownloadOutcome,
  PrototypeLibraryOutcome,
} from '../services/libraryService';

export type PrototypeWaitlistAvailability =
  | 'available'
  | 'limited'
  | 'closed'
  | null;

// One session covers both "is anyone signed in" and "as whom". The roles are
// the account roles from GEN-163; `anonymous` is the signed-out visitor, so
// combinations like a signed-out client cannot be expressed.
export type PrototypeSession = 'anonymous' | 'user' | 'client' | 'coach';

export function isSignedIn(session: PrototypeSession): boolean {
  return session !== 'anonymous';
}

type AppState = {
  session: PrototypeSession;
  signInOutcome: PrototypeSignInOutcome;
  hasBundle: boolean;
  isWaitlistMode: boolean;
  needsOnboarding: boolean;
  nutritionBlockCompleted: boolean;
  nutritionPreferenceConflict: boolean;
  waitlistAvailability: PrototypeWaitlistAvailability;
  isStoreCatalogEmpty: boolean;
  storeCheckoutOutcome: PrototypeStoreCheckoutOutcome;
  isDownloadUnavailable: boolean;
  libraryOutcome: PrototypeLibraryOutcome;
  libraryDownloadOutcome: PrototypeLibraryDownloadOutcome;
};

type AppContextType = {
  appState: AppState;
  setAppState: (state: Partial<AppState>) => void;
};

const defaultState: AppState = {
  session: 'anonymous',
  signInOutcome: 'success',
  hasBundle: false,
  isWaitlistMode: false,
  needsOnboarding: false,
  nutritionBlockCompleted: false,
  nutritionPreferenceConflict: false,
  waitlistAvailability: 'available',
  isStoreCatalogEmpty: false,
  storeCheckoutOutcome: 'success',
  isDownloadUnavailable: false,
  libraryOutcome: 'populated',
  libraryDownloadOutcome: 'success',
};

const validSessions = ['anonymous', 'user', 'client', 'coach'] as const;
const validSignInOutcomes = ['success', 'provisioning-failure'] as const;
const validWaitlistAvailabilities = ['available', 'limited', 'closed'] as const;
const validStoreCheckoutOutcomes = [
  'success',
  'bot-rejected',
  'delivery-failure',
  'rate-limited-cooldown',
  'rate-limited-daily',
  'server-error',
  'unavailable-product',
] as const;
const validLibraryOutcomes = ['populated', 'empty', 'server-error'] as const;
const validLibraryDownloadOutcomes = ['success', 'server-error'] as const;

function parseDevParamsFromURL(): AppState {
  const params = new URLSearchParams(window.location.search);
  const state = { ...defaultState };

  const session = params.get('session');
  if (session && (validSessions as readonly string[]).includes(session)) {
    state.session = session as PrototypeSession;
  }
  const signInOutcome = params.get('signin');
  if (
    signInOutcome &&
    (validSignInOutcomes as readonly string[]).includes(signInOutcome)
  ) {
    state.signInOutcome = signInOutcome as PrototypeSignInOutcome;
  }
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
  const library = params.get('library');
  if (library && (validLibraryOutcomes as readonly string[]).includes(library)) {
    state.libraryOutcome = library as PrototypeLibraryOutcome;
  }
  const libraryDownload = params.get('librarydl');
  if (
    libraryDownload &&
    (validLibraryDownloadOutcomes as readonly string[]).includes(libraryDownload)
  ) {
    state.libraryDownloadOutcome =
      libraryDownload as PrototypeLibraryDownloadOutcome;
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

    url.searchParams.delete('session');
    url.searchParams.delete('signin');
    url.searchParams.delete('bundle');
    url.searchParams.delete('waitlist');
    url.searchParams.delete('nblock');
    url.searchParams.delete('npref');
    url.searchParams.delete('availability');
    url.searchParams.delete('storeempty');
    url.searchParams.delete('checkout');
    url.searchParams.delete('download');
    url.searchParams.delete('library');
    url.searchParams.delete('librarydl');

    if (isSignedIn(appState.session)) {
      url.searchParams.set('session', appState.session);
    }
    if (appState.signInOutcome !== 'success') {
      url.searchParams.set('signin', appState.signInOutcome);
    }
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
    if (appState.libraryOutcome !== 'populated') {
      url.searchParams.set('library', appState.libraryOutcome);
    }
    if (appState.libraryDownloadOutcome !== 'success') {
      url.searchParams.set('librarydl', appState.libraryDownloadOutcome);
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
