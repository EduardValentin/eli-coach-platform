import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import { Button } from "@eli-coach-platform/ui/primitives";
import { FolderOpen, SearchX } from "lucide-react";
import { useFetchers, useRevalidator, useSubmit } from "react-router";

import type {
  ClientResourceListing,
  ClientResourceView,
} from "~/features/client-resources/public/client-resources";
import { resourceOpenedPath } from "~/features/client-resources/public/paths";
import { RESOURCE_NO_MATCHES_COPY } from "~/features/client-resources/ui/shared/resources/resource-copy";
import { ResourceGallery } from "~/features/client-resources/ui/shared/resources/resource-gallery";
import { ResourceToolbar } from "~/features/client-resources/ui/shared/resources/resource-toolbar";
import { ResourcesUnavailable } from "~/features/client-resources/ui/shared/resources/resources-unavailable";
import { useResourceBrowse } from "~/features/client-resources/ui/shared/resources/use-resource-browse";

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

  return <ReadyClientResourceLibrary listing={listing} />;
}

type ReadyClientResourceLibraryProps = {
  listing: Extract<ClientResourceListing, { status: "ready" }>;
};

function ReadyClientResourceLibrary({
  listing,
}: ReadyClientResourceLibraryProps) {
  const { resources } = listing;
  const openings = useResourceOpenings(resources);
  const browsing = useResourceBrowse(listing.browse);

  return (
    <>
      <PortalPageHeader title="Resources" />

      {listing.total > 0 ? (
        <ResourceGallery
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
          onOpenUnopened={openings.record}
          openingsBeingRecorded={openings.openingsBeingRecorded}
          perspective="client"
          resources={resources}
          toolbar={
            <ResourceToolbar
              browse={browsing.browse}
              onChooseTag={browsing.chooseTag}
              onSearch={browsing.search.type}
              searched={listing.searched}
              tagOptions={listing.tagOptions}
              typedSearch={browsing.search.typed}
            />
          }
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
