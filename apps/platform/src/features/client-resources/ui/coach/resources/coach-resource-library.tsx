import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";

import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/contracts/client-resources";
import { possessive } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourceGallery } from "~/features/client-resources/ui/shared/resources/resource-gallery";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";

import { AddResourceDialog } from "./add-resource-dialog";

const ADD_RESOURCE = "Add resource";

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
  const [adding, setAdding] = useState({ formGeneration: 0, open: false });
  const populated = resources.length > 0;

  const startAdding = () =>
    setAdding((current) => ({
      formGeneration: current.formGeneration + 1,
      open: true,
    }));

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
        title={`${possessive(firstName)} resources`}
      />

      {populated ? (
        <ResourceGallery perspective="coach" resources={resources} />
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

      <AddResourceDialog
        clientId={clientId}
        onClose={() => setAdding((current) => ({ ...current, open: false }))}
        open={adding.open}
        formGeneration={adding.formGeneration}
      />
    </>
  );
}
