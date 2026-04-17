import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router';

type AppState = {
  role: 'visitor' | 'client' | 'coach';
  isAuthenticated: boolean;
  hasBundle: boolean;
  isWaitlistMode: boolean;
  needsOnboarding: boolean;
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
};

const validRoles = ['visitor', 'client', 'coach'] as const;

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

    if (appState.role !== 'visitor') url.searchParams.set('role', appState.role);
    if (appState.isAuthenticated) url.searchParams.set('auth', '1');
    if (appState.hasBundle) url.searchParams.set('bundle', '1');
    if (appState.isWaitlistMode) url.searchParams.set('waitlist', '1');

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
