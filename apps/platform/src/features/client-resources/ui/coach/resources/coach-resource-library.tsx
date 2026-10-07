import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useRevalidator } from "react-router";

import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/contracts/client-resources";
import { possessive } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourceGallery } from "~/features/client-resources/ui/shared/resources/resource-gallery";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";

import {
  ResourceActionsMenu,
  ResourceDetailsActions,
  type ResourceManagement,
} from "./resource-actions-menu";
import {
  ResourceFormDialog,
  type ResourceFormMode,
} from "./resource-form-dialog";
import {
  useResourceRemoval,
  useResourceRemovalAnswer,
} from "./use-resource-removal";

const ADD_RESOURCE = "Add resource";

type PendingDeletion = {
  resource: ClientResourceView;
  stage: "asking" | "kept" | "confirmed";
};

type CoachResourceLibraryProps = {
  clientId: string;
  firstName: string;
  listing: ClientResourceListing;
};

export function CoachResourceLibrary({
  clientId,
  firstName,
  listing,
}: CoachResourceLibraryProps) {
  const revalidator = useRevalidator();

  if (listing.status === "unavailable") {
    return (
      <ResourcesUnavailable onRetry={() => void revalidator.revalidate()} />
    );
  }

  return (
    <ReadyResourceLibrary
      clientId={clientId}
      firstName={firstName}
      resources={listing.resources}
    />
  );
}

type ReadyResourceLibraryProps = {
  clientId: string;
  firstName: string;
  resources: readonly ClientResourceView[];
};

function ReadyResourceLibrary({
  clientId,
  firstName,
  resources,
}: ReadyResourceLibraryProps) {
  const [formMode, setFormMode] = useState<ResourceFormMode | null>(null);
  const [deletion, setDeletion] = useState<PendingDeletion | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const removal = useResourceRemoval();
  const listed = resources.filter(
    (resource) => !removal.isBeingRemoved(resource.id),
  );
  const populated = listed.length > 0;
  const deletionUnderway =
    deletion?.stage === "asking" ||
    (deletion?.stage === "confirmed" &&
      removal.awaitsAnswer(deletion.resource.id));

  const startAdding = () => setFormMode({ kind: "add" });

  const manage = (resource: ClientResourceView): ResourceManagement => ({
    onEdit: () => setFormMode({ kind: "edit", resource }),
    onDelete: () => setDeletion({ resource, stage: "asking" }),
  });

  const confirmDeletion = () => {
    if (!deletion) return;

    setDeletion({ ...deletion, stage: "confirmed" });
    removal.remove(deletion.resource.id);
  };

  return (
    <>
      <PortalPageHeader
        actions={
          populated && (
            <Button onClick={startAdding} size="md" variant="primary">
              <Plus aria-hidden="true" size={16} />
              {ADD_RESOURCE}
            </Button>
          )
        }
        headingRef={heading}
        title={`${possessive(firstName)} resources`}
      />

      {populated ? (
        <ResourceGallery
          detailsActionsFor={(resource) => (
            <ResourceDetailsActions management={manage(resource)} />
          )}
          menuFor={(resource) => (
            <ResourceActionsMenu
              management={manage(resource)}
              title={resource.title}
            />
          )}
          perspective="coach"
          resources={listed}
          returnFocusTo={deletionUnderway ? heading : undefined}
        />
      ) : (
        <EmptyState
          action={
            <Button onClick={startAdding} size="sm" variant="primary">
              <Plus aria-hidden="true" size={16} />
              {ADD_RESOURCE}
            </Button>
          }
          description={`Share a guide, a plan or a photo with ${firstName}.`}
          icon={FolderOpen}
          title="No resources yet"
        />
      )}

      <ResourceFormDialog
        clientId={clientId}
        mode={formMode}
        onClose={() => setFormMode(null)}
      />

      <ConfirmDialog
        cancelLabel="Keep"
        confirmLabel="Delete"
        description={`It’s removed for you and ${firstName}.`}
        onConfirm={confirmDeletion}
        onOpenChange={(open) => {
          if (!open && deletion?.stage === "asking") {
            setDeletion({ ...deletion, stage: "kept" });
          }
        }}
        open={deletion?.stage === "asking"}
        returnFocusTo={deletion?.stage === "confirmed" ? heading : undefined}
        title={`Delete “${deletion?.resource.title ?? ""}”?`}
        tone="destructive"
      />

      {removal.unanswered.map((resourceId) => (
        <ResourceRemovalAnswer
          key={resourceId}
          onAnswered={removal.answered}
          resourceId={resourceId}
        />
      ))}
    </>
  );
}

type ResourceRemovalAnswerProps = {
  resourceId: string;
  onAnswered: (resourceId: string) => void;
};

function ResourceRemovalAnswer({
  resourceId,
  onAnswered,
}: ResourceRemovalAnswerProps) {
  useResourceRemovalAnswer(resourceId, onAnswered);

  return null;
}
