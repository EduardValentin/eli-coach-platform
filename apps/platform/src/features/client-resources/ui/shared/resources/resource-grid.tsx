import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";

import { ResourceCard, type ResourcePerspective } from "./resource-card";

type ResourceGridProps = {
  resources: readonly ClientResourceView[];
  perspective: ResourcePerspective;
  unopenedIds: ReadonlySet<string>;
  onOpen: (resource: ClientResourceView) => void;
};

export function ResourceGrid({
  resources,
  perspective,
  unopenedIds,
  onOpen,
}: ResourceGridProps) {
  return (
    <section aria-label="Resources">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            onOpen={() => onOpen(resource)}
            perspective={perspective}
            resource={resource}
            unopened={unopenedIds.has(resource.id)}
          />
        ))}
      </ul>
    </section>
  );
}
