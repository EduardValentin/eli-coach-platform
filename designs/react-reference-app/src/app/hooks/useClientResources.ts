import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppContext';
import { useResourceServer } from '../context/ResourceContext';
import {
  hasUnopenedResources,
  type Resource,
  type ResourceDetails,
} from '../domain/resources';
import type { ResourceDownload } from '../services/resourceService';

export type ResourceListing =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; resources: Resource[] };

export type NewResourceUpload = { file: File; details: ResourceDetails };

export type ClientResources = {
  listing: ResourceListing;
  retry: () => void;
  add: (upload: NewResourceUpload, onProgress: (fraction: number) => void) => Promise<Resource>;
  updateDetails: (id: string, details: ResourceDetails) => Promise<Resource>;
  remove: (id: string) => Promise<void>;
  markOpened: (id: string) => Promise<void>;
  download: (id: string) => Promise<ResourceDownload>;
};

export function useClientResources(clientId: string): ClientResources {
  const { server, revision, announceChange } = useResourceServer();
  const { appState } = useAppState();
  const [listing, setListing] = useState<ResourceListing>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const listedRevision = useRef(revision);

  useEffect(() => {
    const refreshOnly = listedRevision.current !== revision;
    listedRevision.current = revision;
    if (!refreshOnly) setListing({ status: 'loading' });

    let current = true;
    server
      .listForClient(clientId, appState.resourceLoad)
      .then((resources) => {
        if (current) setListing({ status: 'ready', resources });
      })
      .catch(() => {
        if (current) setListing({ status: 'failed' });
      });

    return () => {
      current = false;
    };
  }, [server, clientId, appState.resourceLoad, revision, attempt]);

  const changeListed = (change: (resources: Resource[]) => Resource[]) =>
    setListing((previous) =>
      previous.status === 'ready'
        ? { status: 'ready', resources: change(previous.resources) }
        : previous,
    );

  const replaceListed = (updated: Resource) =>
    changeListed((resources) =>
      resources.map((resource) => (resource.id === updated.id ? updated : resource)),
    );

  return {
    listing,
    retry: () => setAttempt((count) => count + 1),
    add: async (upload, onProgress) => {
      const added = await server.add(
        { clientId, ...upload },
        { outcome: appState.resourceUpload, onProgress },
      );
      changeListed((resources) => [added, ...resources]);
      announceChange();
      return added;
    },
    updateDetails: async (id, details) => {
      const updated = await server.updateDetails(id, details);
      replaceListed(updated);
      announceChange();
      return updated;
    },
    remove: async (id) => {
      await server.remove(id);
      changeListed((resources) => resources.filter((resource) => resource.id !== id));
      announceChange();
    },
    markOpened: async (id) => {
      changeListed((resources) =>
        resources.map((resource) =>
          resource.id === id && resource.openedAt === null
            ? { ...resource, openedAt: new Date() }
            : resource,
        ),
      );
      await server.markOpened(id);
      announceChange();
    },
    download: (id) => server.download(id),
  };
}

export function useUnopenedResources(clientId: string): boolean {
  const { server, revision } = useResourceServer();
  const { appState } = useAppState();
  const [unopened, setUnopened] = useState(false);

  useEffect(() => {
    let current = true;
    server
      .listForClient(clientId, appState.resourceLoad)
      .then((resources) => {
        if (current) setUnopened(hasUnopenedResources(resources));
      })
      .catch(() => {
        if (current) setUnopened(false);
      });

    return () => {
      current = false;
    };
  }, [server, clientId, appState.resourceLoad, revision]);

  return unopened;
}

export function useResourceTags(): readonly string[] {
  const { server, revision } = useResourceServer();
  const [tags, setTags] = useState<readonly string[]>([]);

  useEffect(() => {
    let current = true;
    server.listTags().then((vocabulary) => {
      if (current) setTags(vocabulary);
    });

    return () => {
      current = false;
    };
  }, [server, revision]);

  return tags;
}
