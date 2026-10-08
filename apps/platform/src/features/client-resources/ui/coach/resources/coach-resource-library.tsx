import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, Plus } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { useRevalidator } from "react-router";

import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/public/client-resources";
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
  const heading = useRef<HTMLHeadingElement>(null);
  const removal = useResourceRemoval();
  const deletion = useResourceDeletion(removal, heading);
  const listed = resources.filter(
    (resource) => !removal.isBeingRemoved(resource.id),
  );
  const populated = listed.length > 0;

  const startAdding = () => setFormMode({ kind: "add", clientId });

  const managementOf = (resource: ClientResourceView): ResourceManagement => ({
    onEdit: () => setFormMode({ kind: "edit", resource }),
    onDelete: () => deletion.ask(resource),
  });

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
            <ResourceDetailsActions management={managementOf(resource)} />
          )}
          menuFor={(resource) => (
            <ResourceActionsMenu
              management={managementOf(resource)}
              title={resource.title}
            />
          )}
          perspective="coach"
          resources={listed}
          returnFocusTo={deletion.viewerFocusTarget}
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

      <ResourceFormDialog mode={formMode} onClose={() => setFormMode(null)} />

      <ConfirmDialog
        cancelLabel="Keep"
        confirmLabel="Delete"
        description={`It’s removed for you and ${firstName}.`}
        onConfirm={deletion.confirm}
        onOpenChange={(open) => {
          if (!open) deletion.keep();
        }}
        open={deletion.asking}
        returnFocusTo={deletion.confirmFocusTarget}
        title={`Delete “${deletion.title}”?`}
        tone="destructive"
      />

      {removal.unansweredIds.map((resourceId) => (
        <ResourceRemovalAnswer
          key={resourceId}
          onAnswered={removal.forgetAnswered}
          resourceId={resourceId}
        />
      ))}
    </>
  );
}

function useResourceDeletion(
  removal: ReturnType<typeof useResourceRemoval>,
  heading: RefObject<HTMLHeadingElement | null>,
) {
  const [deletion, setDeletion] = useState<PendingDeletion | null>(null);
  const asking = deletion?.stage === "asking";
  const confirmedAwaitingAnswer =
    deletion?.stage === "confirmed" &&
    removal.answerNotYetShown(deletion.resource.id);
  const viewerReturnsFocusToHeading = asking || confirmedAwaitingAnswer;

  return {
    asking,
    title: deletion?.resource.title ?? "",
    viewerFocusTarget: viewerReturnsFocusToHeading ? heading : undefined,
    confirmFocusTarget: deletion?.stage === "confirmed" ? heading : undefined,
    ask: (resource: ClientResourceView) =>
      setDeletion({ resource, stage: "asking" }),
    keep: () => {
      if (deletion?.stage === "asking") {
        setDeletion({ ...deletion, stage: "kept" });
      }
    },
    confirm: () => {
      if (!deletion) return;

      setDeletion({ ...deletion, stage: "confirmed" });
      removal.remove(deletion.resource.id);
    },
  };
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
