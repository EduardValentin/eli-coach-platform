import { useState, type ReactNode, type RefObject } from "react";

import type { ClientResourceView } from "~/features/client-resources/public/client-resources";

import type { ResourcePerspective } from "./resource-card";
import { ResourceGrid } from "./resource-grid";
import { ResourceViewer } from "./resource-viewer";

const NO_OPENINGS_BEING_RECORDED: ReadonlySet<string> = new Set();

type ResourceGalleryProps = {
  resources: readonly ClientResourceView[];
  perspective: ResourcePerspective;
  openingsBeingRecorded?: ReadonlySet<string>;
  onOpenUnopened?: (resource: ClientResourceView) => void;
  menuFor?: (resource: ClientResourceView) => ReactNode;
  detailsActionsFor?: (resource: ClientResourceView) => ReactNode;
  returnFocusTo?: RefObject<HTMLElement | null>;
  toolbar?: ReactNode;
  noMatches?: ReactNode;
};

export function ResourceGallery({
  resources,
  perspective,
  openingsBeingRecorded = NO_OPENINGS_BEING_RECORDED,
  onOpenUnopened,
  menuFor,
  detailsActionsFor,
  returnFocusTo,
  toolbar,
  noMatches,
}: ResourceGalleryProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = resources.find((resource) => resource.id === viewingId);
  const unopenedIds = new Set(
    resources
      .filter(
        (resource) =>
          resource.openedAt === null && !openingsBeingRecorded.has(resource.id),
      )
      .map((resource) => resource.id),
  );

  if (viewingId !== null && viewing === undefined) {
    setViewingId(null);
  }

  const open = (resource: ClientResourceView) => {
    setViewingId(resource.id);

    if (unopenedIds.has(resource.id)) {
      onOpenUnopened?.(resource);
    }
  };

  return (
    <>
      <ResourceGrid
        menuFor={menuFor}
        noMatches={noMatches}
        onOpen={open}
        perspective={perspective}
        resources={resources}
        toolbar={toolbar}
        unopenedIds={unopenedIds}
      />
      <ResourceViewer
        actions={viewing && detailsActionsFor?.(viewing)}
        onClose={() => setViewingId(null)}
        resource={viewing}
        returnFocusTo={returnFocusTo}
      />
    </>
  );
}
