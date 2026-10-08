import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { FolderOpen } from "lucide-react";
import { useFetchers, useRevalidator, useSubmit } from "react-router";

import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/public/client-resources";
import { resourceOpenedPath } from "~/features/client-resources/public/paths";
import { ResourceGallery } from "~/features/client-resources/ui/shared/resources/resource-gallery";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";

type ClientResourceLibraryProps = {
  listing: ClientResourceListing;
};

export function ClientResourceLibrary({ listing }: ClientResourceLibraryProps) {
  const revalidator = useRevalidator();

  if (listing.status === "unavailable") {
    return (
      <ResourcesUnavailable onRetry={() => void revalidator.revalidate()} />
    );
  }

  return <ReadyClientResourceLibrary resources={listing.resources} />;
}

type ReadyClientResourceLibraryProps = {
  resources: readonly ClientResourceView[];
};

function ReadyClientResourceLibrary({
  resources,
}: ReadyClientResourceLibraryProps) {
  const openings = useResourceOpenings(resources);

  return (
    <>
      <PortalPageHeader title="Resources" />

      {resources.length > 0 ? (
        <ResourceGallery
          onOpenUnopened={openings.record}
          openingsBeingRecorded={openings.openingsBeingRecorded}
          perspective="client"
          resources={resources}
        />
      ) : (
        <EmptyState
          description="When your coach shares a guide or a plan, it lands here."
          icon={FolderOpen}
          title="Nothing here yet"
        />
      )}
    </>
  );
}

function useResourceOpenings(resources: readonly ClientResourceView[]) {
  const submit = useSubmit();
  const pendingFetcherKeys = new Set(
    useFetchers().map((fetcher) => fetcher.key),
  );
  const openingsBeingRecorded = new Set(
    resources
      .filter((resource) =>
        pendingFetcherKeys.has(resourceOpenedPath(resource.id)),
      )
      .map((resource) => resource.id),
  );

  const record = (resource: ClientResourceView) => {
    const action = resourceOpenedPath(resource.id);

    void submit(null, {
      action,
      fetcherKey: action,
      method: "post",
      navigate: false,
    });
  };

  return { openingsBeingRecorded, record };
}
