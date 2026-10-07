import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createResourceServer } from '../services/resourceSamples';
import type { ResourceServer } from '../services/resourceService';
import { useAppState } from './AppContext';

type ResourceContextValue = {
  server: ResourceServer;
  revision: number;
  announceChange: () => void;
};

const ResourceContext = createContext<ResourceContextValue | null>(null);

export function ResourceProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const server = useMemo(
    () => createResourceServer(appState.resourceSeed),
    [appState.resourceSeed],
  );
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    server.releaseHeldUploads(appState.resourceUpload);
  }, [server, appState.resourceUpload]);
  const announceChange = useCallback(() => setRevision((current) => current + 1), []);

  return (
    <ResourceContext.Provider value={{ server, revision, announceChange }}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResourceServer(): ResourceContextValue {
  const context = useContext(ResourceContext);
  if (!context) throw new Error('useResourceServer must be used within ResourceProvider');

  return context;
}
