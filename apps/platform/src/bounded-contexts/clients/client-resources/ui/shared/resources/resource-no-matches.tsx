import { EmptyState } from "~/shared/design-system/portal";
import { Button } from "~/shared/design-system/primitives";
import { SearchX } from "lucide-react";

import { RESOURCE_NO_MATCHES_COPY } from "./resource-copy";

export function ResourceNoMatches({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <EmptyState
      action={
        <Button onClick={onClearFilters} size="sm" variant="outline">
          {RESOURCE_NO_MATCHES_COPY.clearFilters}
        </Button>
      }
      description={RESOURCE_NO_MATCHES_COPY.description}
      icon={SearchX}
      title={RESOURCE_NO_MATCHES_COPY.title}
    />
  );
}
