import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CloudOff, SearchX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import {
  browseResources,
  coachTagVocabulary,
  DEFAULT_RESOURCE_SORT,
  defaultResourceSortDirection,
  type Resource,
  type ResourceFilter,
  type ResourceSort,
  type ResourceSortKey,
} from '../../domain/resources';
import { sameTag } from '../../domain/tags';
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

const BROWSE_PARAMS = {
  tag: 'tag',
  search: 'q',
  sort: 'sort',
  direction: 'dir',
} as const;

const SEARCH_WRITE_PAUSE_MS = 300;

export function ResourceGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading resources"
      data-parity="resource-grid-skeleton"
      role="status"
    >
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

function writeParam(params: URLSearchParams, name: string, value: string | null) {
  if (value === null || value.trim().length === 0) params.delete(name);
  else params.set(name, value);
}

function writeSort(params: URLSearchParams, sort: ResourceSort) {
  const isDefaultKey = sort.key === DEFAULT_RESOURCE_SORT.key;
  const isDefaultDirection = sort.direction === defaultResourceSortDirection(sort.key);
  writeParam(params, BROWSE_PARAMS.sort, isDefaultKey ? null : sort.key);
  writeParam(params, BROWSE_PARAMS.direction, isDefaultDirection ? null : sort.direction);
}

function sortFrom(params: URLSearchParams): ResourceSort {
  const key: ResourceSortKey =
    params.get(BROWSE_PARAMS.sort) === 'title' ? 'title' : DEFAULT_RESOURCE_SORT.key;
  const direction = params.get(BROWSE_PARAMS.direction);

  return {
    key,
    direction:
      direction === 'asc' || direction === 'desc' ? direction : defaultResourceSortDirection(key),
  };
}

function heldTagFrom(params: URLSearchParams, resources: readonly Resource[]): string | null {
  const addressed = params.get(BROWSE_PARAMS.tag);
  if (addressed === null) return null;

  return coachTagVocabulary(resources).find((held) => sameTag(held, addressed)) ?? null;
}

function useAddressedBrowse(resources: readonly Resource[]) {
  const [params, setParams] = useSearchParams();
  const addressedSearch = params.get(BROWSE_PARAMS.search) ?? '';
  const [typedSearch, setTypedSearch] = useState(addressedSearch);

  const rewrite = useCallback(
    (edit: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      edit(next);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    if (typedSearch.trim() === addressedSearch.trim()) return;

    const pause = window.setTimeout(
      () => rewrite((next) => writeParam(next, BROWSE_PARAMS.search, typedSearch)),
      SEARCH_WRITE_PAUSE_MS,
    );

    return () => window.clearTimeout(pause);
  }, [typedSearch, addressedSearch, rewrite]);

  const filter: ResourceFilter = { tag: heldTagFrom(params, resources), query: addressedSearch };

  return {
    filter,
    sort: sortFrom(params),
    typedSearch,
    typeSearch: setTypedSearch,
    chooseTag: (tag: string | null) =>
      rewrite((next) => writeParam(next, BROWSE_PARAMS.tag, tag)),
    chooseSort: (sort: ResourceSort) => rewrite((next) => writeSort(next, sort)),
    clearFilters: () => {
      setTypedSearch('');
      rewrite((next) => {
        next.delete(BROWSE_PARAMS.tag);
        next.delete(BROWSE_PARAMS.search);
      });
    },
  };
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
  const browse = useAddressedBrowse(resources);
  const shown = browseResources(resources, browse.filter, browse.sort);

  return (
    <section aria-label="Resources">
      <ResourceToolbar
        filter={browse.filter}
        onSearchChange={browse.typeSearch}
        onSortChange={browse.chooseSort}
        onTagChange={browse.chooseTag}
        perspective={perspective}
        resources={resources}
        sort={browse.sort}
        typedSearch={browse.typedSearch}
      />

      {shown.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={browse.clearFilters}
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
