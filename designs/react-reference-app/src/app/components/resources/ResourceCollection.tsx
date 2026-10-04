import { useState, type ReactNode } from 'react';
import { CloudOff, SearchX } from 'lucide-react';
import {
  browseResources,
  coachTagVocabulary,
  DEFAULT_RESOURCE_SORT,
  NO_RESOURCE_FILTER,
  type Resource,
  type ResourceFilter,
  type ResourceSort,
} from '../../domain/resources';
import { hasTag } from '../../domain/tags';
import { EmptyState } from '../EmptyState';
import { DeadEndPanel } from '../ErrorPage';
import { Button } from '../ui/button';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { Skeleton } from '../ui/skeleton';
import { ResourceCard, type ResourcePerspective } from './ResourceCard';
import { ResourceToolbar } from './ResourceToolbar';

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4';

const SKELETON_CARDS = 8;

export function ResourceGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading resources" role="status">
      <ul className={GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li
            className={cn(cardVariants({ variant: 'card' }), 'flex flex-col gap-2.5 p-2.5 sm:p-3')}
            key={index}
          >
            <Skeleton className="aspect-3/4 w-full" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-4/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResourcesUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full" data-parity-root="ResourcesUnavailable">
      <DeadEndPanel
        action={
          <Button onClick={onRetry} size="md" type="button" variant="outline">
            Try again
          </Button>
        }
        description="Something went wrong on our side. Try again in a moment."
        icon={CloudOff}
        title="Resources didn’t load"
      />
    </div>
  );
}

export function ResourceCollection({
  resources,
  perspective,
  onOpen,
  menuFor,
}: {
  resources: readonly Resource[];
  perspective: ResourcePerspective;
  onOpen: (resource: Resource) => void;
  menuFor?: (resource: Resource) => ReactNode;
}) {
  const [chosenFilter, setFilter] = useState<ResourceFilter>(NO_RESOURCE_FILTER);
  const [sort, setSort] = useState<ResourceSort>(DEFAULT_RESOURCE_SORT);
  const tagStillHeld =
    chosenFilter.tag === null || hasTag(coachTagVocabulary(resources), chosenFilter.tag);
  const filter = tagStillHeld ? chosenFilter : { ...chosenFilter, tag: null };
  const shown = browseResources(resources, filter, sort);

  return (
    <section aria-label="Resources">
      <ResourceToolbar
        filter={filter}
        onFilterChange={setFilter}
        onSortChange={setSort}
        perspective={perspective}
        resources={resources}
        sort={sort}
      />

      {shown.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => setFilter(NO_RESOURCE_FILTER)}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear filters
            </Button>
          }
          description="Try another tag or search."
          icon={SearchX}
          title="No matches"
        />
      ) : (
        <ul className={GRID_CLASS}>
          {shown.map((resource) => (
            <ResourceCard
              key={resource.id}
              menu={menuFor?.(resource)}
              onOpen={() => onOpen(resource)}
              perspective={perspective}
              resource={resource}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
