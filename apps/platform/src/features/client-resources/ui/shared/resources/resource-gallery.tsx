import { useState } from "react";

import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";

import type { ResourcePerspective } from "./resource-card";
import { ResourceGrid } from "./resource-grid";
import { ResourceViewer } from "./resource-viewer";

const NONE_OPENED_SINCE_LOAD: ReadonlySet<string> = new Set();

type ResourceGalleryProps = {
  resources: readonly ClientResourceView[];
  perspective: ResourcePerspective;
  openedSinceLoad?: ReadonlySet<string>;
  onOpenUnopened?: (resource: ClientResourceView) => void;
};

export function ResourceGallery({
  resources,
  perspective,
  openedSinceLoad = NONE_OPENED_SINCE_LOAD,
  onOpenUnopened,
}: ResourceGalleryProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = resources.find((resource) => resource.id === viewingId);
  const unopenedIds = new Set(
    resources
      .filter(
        (resource) =>
          resource.openedAt === null && !openedSinceLoad.has(resource.id),
      )
      .map((resource) => resource.id),
  );

  const open = (resource: ClientResourceView) => {
    setViewingId(resource.id);

    if (unopenedIds.has(resource.id)) {
      onOpenUnopened?.(resource);
    }
  };

  return (
    <>
      <ResourceGrid
        onOpen={open}
        perspective={perspective}
        resources={resources}
        unopenedIds={unopenedIds}
      />
      <ResourceViewer onClose={() => setViewingId(null)} resource={viewing} />
    </>
  );
}
