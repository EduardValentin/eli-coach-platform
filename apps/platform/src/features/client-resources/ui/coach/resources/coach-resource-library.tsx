import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, Plus, SearchX } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { useRevalidator } from "react-router";

import type {
  ClientResourceView,
  CoachResourceListing,
} from "~/features/client-resources/public/client-resources";
import {
  possessive,
  RESOURCE_NO_MATCHES_COPY,
} from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourceGallery } from "~/features/client-resources/ui/shared/resources/resource-gallery";
import { ResourceToolbar } from "~/features/client-resources/ui/shared/resources/resource-toolbar";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";
import { useResourceBrowse } from "~/features/client-resources/ui/shared/resources/use-resource-browse";

import {
  ResourceActionsMenu,
  ResourceDetailsActions,
  type ResourceManagement,
} from "./resource-actions-menu";
import {
  ResourceFormDialog,
  type ResourceFormMode,
} from "./resource-form-dialog";
import { ResourceSortControl } from "./resource-sort-control";
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
  listing: CoachResourceListing;
};

type ReadyCoachResourceListing = Extract<
  CoachResourceListing,
  { status: "ready" }
>;

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
      listing={listing}
    />
  );
}

type ReadyResourceLibraryProps = {
  clientId: string;
  firstName: string;
  listing: ReadyCoachResourceListing;
};

function ReadyResourceLibrary({
  clientId,
  firstName,
  listing,
}: ReadyResourceLibraryProps) {
  const [formMode, setFormMode] = useState<ResourceFormMode | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const removal = useResourceRemoval();
  const deletion = useResourceDeletion(removal, heading);
  const browsing = useResourceBrowse(listing.browse);
  const listed = listing.resources.filter(
    (resource) => !removal.isBeingRemoved(resource.id),
  );
  const removing = listing.resources.length - listed.length;
  const populated = listing.total - removing > 0;

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
          noMatches={
            <EmptyState
              action={
                <Button
                  onClick={browsing.clearFilters}
                  size="sm"
                  variant="outline"
                >
                  {RESOURCE_NO_MATCHES_COPY.clearFilters}
                </Button>
              }
              description={RESOURCE_NO_MATCHES_COPY.description}
              icon={SearchX}
              title={RESOURCE_NO_MATCHES_COPY.title}
            />
          }
          perspective="coach"
          resources={listed}
          returnFocusTo={deletion.viewerFocusTarget}
          toolbar={
            <ResourceToolbar
              browse={browsing.browse}
              onChooseTag={browsing.chooseTag}
              onSearch={browsing.search.type}
              searched={listing.searched}
              sort={(size) => (
                <ResourceSortControl
                  onChange={browsing.chooseSort}
                  size={size}
                  sort={{
                    direction: browsing.browse.direction,
                    key: browsing.browse.sort,
                  }}
                />
              )}
              tagOptions={listing.tagOptions}
              typedSearch={browsing.search.typed}
            />
          }
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
        mode={formMode}
        onClose={() => setFormMode(null)}
        vocabulary={listing.vocabulary}
      />

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
