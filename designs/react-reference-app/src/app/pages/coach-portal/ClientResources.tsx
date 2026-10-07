import { useState } from 'react';
import { useParams } from 'react-router';
import { FolderOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { EmptyState } from '../../components/EmptyState';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ResourceActionsMenu, type ResourceManagement } from '../../components/resources/ResourceActionsMenu';
import {
  ResourceCollection,
  ResourceGridSkeleton,
  ResourcesUnavailable,
} from '../../components/resources/ResourceCollection';
import {
  ResourceFormDialog,
  type ResourceFormMode,
} from '../../components/resources/ResourceFormDialog';
import { ResourceViewer } from '../../components/resources/ResourceViewer';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { fullName, useClientProfile } from '../../context/ClientProfileContext';
import type { JourneyIdentity } from '../../domain/journey';
import type { Resource } from '../../domain/resources';
import { useClientResources, useResourceTags } from '../../hooks/useClientResources';
import { possessive } from '../../utils/resourceLabels';
import { saveDownload } from '../../utils/saveDownload';

type ClientNames = { first: string; full: string };

type PendingDeletion = { resource: Resource; open: boolean };

function CoachResourceLibrary({
  clientId,
  routeId,
  names,
}: {
  clientId: string;
  routeId: string;
  names: ClientNames;
}) {
  const resources = useClientResources(clientId);
  const vocabulary = useResourceTags();
  const [formMode, setFormMode] = useState<ResourceFormMode | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletion, setDeletion] = useState<PendingDeletion | null>(null);
  const { listing } = resources;
  const listed = listing.status === 'ready' ? listing.resources : [];
  const viewing = listed.find((resource) => resource.id === viewingId);
  const populated = listed.length > 0;
  const offersHeaderAdd = listing.status === 'loading' || populated;

  const startAdding = () => setFormMode({ kind: 'add', onAdd: resources.add });

  const manage = (resource: Resource): ResourceManagement => ({
    onEdit: () =>
      setFormMode({
        kind: 'edit',
        resource,
        onSave: (details) => resources.updateDetails(resource.id, details),
      }),
    onDelete: () => setDeletion({ resource, open: true }),
  });

  const confirmDeletion = async () => {
    if (!deletion) return;
    const { id } = deletion.resource;
    setDeletion({ ...deletion, open: false });
    if (viewingId === id) setViewingId(null);
    await resources.remove(id);
    toast.success('Resource deleted.');
  };

  const download = async (resource: Resource) => {
    saveDownload(await resources.download(resource.id));
  };

  return (
    <div className="w-full" data-parity-root="CoachResourceLibrary">
      <PortalBackLink to={`/coach/clients/${routeId}`}>Back to {names.full}</PortalBackLink>

      {listing.status !== 'failed' && (
        <PortalPageHeader
          actions={
            offersHeaderAdd && (
              <Button onClick={startAdding} size="md" type="button" variant="primary">
                <Plus aria-hidden="true" />
                Add resource
              </Button>
            )
          }
          title={`${possessive(names.first)} resources`}
        />
      )}

      {listing.status === 'loading' && <ResourceGridSkeleton />}
      {listing.status === 'failed' && <ResourcesUnavailable onRetry={resources.retry} />}
      {listing.status === 'ready' && !populated && (
        <EmptyState
          action={
            <Button onClick={startAdding} size="sm" type="button" variant="primary">
              <Plus aria-hidden="true" />
              Add resource
            </Button>
          }
          description={`Share a guide, a plan or a photo with ${names.first}.`}
          icon={FolderOpen}
          title="No resources yet"
        />
      )}
      {populated && (
        <ResourceCollection
          menuFor={(resource) => (
            <ResourceActionsMenu management={manage(resource)} title={resource.title} />
          )}
          onOpen={(resource) => setViewingId(resource.id)}
          perspective="coach"
          resources={listed}
        />
      )}

      <ResourceViewer
        management={viewing && manage(viewing)}
        onClose={() => setViewingId(null)}
        onDownload={download}
        resource={viewing}
      />

      <ResourceFormDialog
        mode={formMode}
        onClose={() => setFormMode(null)}
        vocabulary={vocabulary}
      />

      <ConfirmDialog
        cancelLabel="Keep"
        confirmLabel="Delete"
        description={`It’s removed for you and ${names.first}.`}
        onConfirm={confirmDeletion}
        onOpenChange={(open) => {
          if (!open && deletion) setDeletion({ ...deletion, open: false });
        }}
        open={deletion?.open === true}
        title={`Delete “${deletion?.resource.title ?? ''}”?`}
        tone="destructive"
      />
    </div>
  );
}

type ResourceClient = { clientId: string; names: ClientNames };

function useResourceClient(id: string): ResourceClient | null {
  const { journeyForCall } = useClientJourneys();
  const { getProfile } = useClientProfile();
  const journey = journeyForCall(id);
  if (journey) {
    return { clientId: journey.callId, names: journeyNames(journey.identity) };
  }

  const profile = getProfile(id);
  if (!profile) return null;

  return {
    clientId: profile.id,
    names: { first: profile.firstName, full: fullName(profile) },
  };
}

function journeyNames(identity: JourneyIdentity): ClientNames {
  return {
    first: identity.firstName,
    full: `${identity.firstName} ${identity.lastName}`.trim(),
  };
}

export function ClientResources() {
  const { id = 'c1' } = useParams();
  const client = useResourceClient(id);

  if (!client) return <ClientNotFound />;

  return <CoachResourceLibrary clientId={client.clientId} names={client.names} routeId={id} />;
}
