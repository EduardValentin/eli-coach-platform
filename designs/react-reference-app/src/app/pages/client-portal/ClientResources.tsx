import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import {
  ResourceCollection,
  ResourceGridSkeleton,
  ResourcesUnavailable,
} from '../../components/resources/ResourceCollection';
import { ResourceViewer } from '../../components/resources/ResourceViewer';
import { SIGNED_IN_CLIENT_ID } from '../../context/ClientProfileContext';
import { isUnopened, type Resource } from '../../domain/resources';
import { useClientResources } from '../../hooks/useClientResources';
import { saveDownload } from '../../utils/saveDownload';

export function ClientResources() {
  const resources = useClientResources(SIGNED_IN_CLIENT_ID);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { listing } = resources;
  const listed = listing.status === 'ready' ? listing.resources : [];
  const viewing = listed.find((resource) => resource.id === viewingId);

  const open = (resource: Resource) => {
    setViewingId(resource.id);
    if (isUnopened(resource)) void resources.markOpened(resource.id);
  };

  const download = async (resource: Resource) => {
    saveDownload(await resources.download(resource.id));
  };

  return (
    <div className="w-full">
      {listing.status !== 'failed' && <PortalPageHeader title="Resources" />}

      {listing.status === 'loading' && <ResourceGridSkeleton />}
      {listing.status === 'failed' && <ResourcesUnavailable onRetry={resources.retry} />}
      {listing.status === 'ready' && listed.length === 0 && (
        <EmptyState
          description="When your coach shares a guide or a plan, it lands here."
          icon={FolderOpen}
          title="Nothing here yet"
        />
      )}
      {listed.length > 0 && (
        <ResourceCollection onOpen={open} perspective="client" resources={listed} />
      )}

      <ResourceViewer
        onClose={() => setViewingId(null)}
        onDownload={download}
        resource={viewing}
      />
    </div>
  );
}
