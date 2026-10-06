import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, Plus } from "lucide-react";
import { useState } from "react";

import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";
import { possessive } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourceGrid } from "~/features/client-resources/ui/shared/resources/resource-grid";
import { ResourceViewer } from "~/features/client-resources/ui/shared/resources/resource-viewer";

import { AddResourceDialog } from "./add-resource-dialog";

const ADD_RESOURCE = "Add resource";

type CoachResourceLibraryProps = {
  clientId: string;
  firstName: string;
  resources: readonly ClientResourceView[];
};

export function CoachResourceLibrary({
  clientId,
  firstName,
  resources,
}: CoachResourceLibraryProps) {
  const [adding, setAdding] = useState({ formGeneration: 0, open: false });
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = resources.find((resource) => resource.id === viewingId);
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
        <ResourceGrid
          onOpen={(resource) => setViewingId(resource.id)}
          resources={resources}
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

      <ResourceViewer onClose={() => setViewingId(null)} resource={viewing} />

      <AddResourceDialog
        clientId={clientId}
        onClose={() => setAdding((current) => ({ ...current, open: false }))}
        open={adding.open}
        formGeneration={adding.formGeneration}
      />
    </>
  );
}
