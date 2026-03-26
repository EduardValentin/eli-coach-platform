import { createContext, useContext, useState, ReactNode } from 'react';

type AppState = {
  role: 'visitor' | 'client' | 'coach';
  isAuthenticated: boolean;
  hasBundle: boolean;
};

type AppContextType = {
  appState: AppState;
  setAppState: (state: Partial<AppState>) => void;
};

const defaultState: AppState = {
  role: 'visitor',
  isAuthenticated: false,
  hasBundle: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [appState, setFullState] = useState<AppState>(defaultState);

  const setAppState = (state: Partial<AppState>) => {
    setFullState(prev => ({ ...prev, ...state }));
  };

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
