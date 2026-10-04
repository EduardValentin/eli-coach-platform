import {
  tagCounts,
  type Resource,
  type ResourceFilter,
  type ResourceSort,
  type ResourceSortKey,
} from '../../domain/resources';
import { SearchField } from '../SearchField';
import type { ResourcePerspective } from './ResourceCard';
import { SortControl, type SortOption } from '../SortControl';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useIsMobile } from '../ui/use-mobile';

const ALL_TAGS = '__all__';

export const RESOURCE_SORT_OPTIONS: readonly SortOption<ResourceSortKey>[] = [
  {
    key: 'added',
    label: 'Date added',
    order: 'chronological',
    defaultDirection: 'desc',
    directionLabels: { desc: 'Newest first', asc: 'Oldest first' },
  },
  {
    key: 'title',
    label: 'Title',
    order: 'alphabetical',
    defaultDirection: 'asc',
    directionLabels: { asc: 'A to Z', desc: 'Z to A' },
  },
];

function TagFilter({
  resources,
  chosen,
  onChoose,
  size,
}: {
  resources: readonly Resource[];
  chosen: string | null;
  onChoose: (tag: string | null) => void;
  size: 'sm' | 'md';
}) {
  return (
    <Select
      onValueChange={(value) => onChoose(value === ALL_TAGS ? null : value)}
      value={chosen ?? ALL_TAGS}
    >
      <SelectTrigger aria-label="Tag" className="w-full md:w-56" size={size}>
        <SelectValue>{chosen ?? 'All tags'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TAGS}>
          <span className="flex items-center gap-2">
            All tags <Badge tone="count">{resources.length}</Badge>
          </span>
        </SelectItem>
        {tagCounts(resources).map(({ tag, count }) => (
          <SelectItem key={tag} value={tag}>
            <span className="flex items-center gap-2">
              {tag} <Badge tone="count">{count}</Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ResourceToolbar({
  resources,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  perspective,
}: {
  resources: readonly Resource[];
  filter: ResourceFilter;
  onFilterChange: (filter: ResourceFilter) => void;
  sort: ResourceSort;
  onSortChange: (sort: ResourceSort) => void;
  perspective: ResourcePerspective;
}) {
  const size = useIsMobile() ? 'md' : 'sm';

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:flex md:items-center">
      <div className="min-w-0 md:mr-auto">
        <TagFilter
          chosen={filter.tag}
          onChoose={(tag) => onFilterChange({ ...filter, tag })}
          resources={resources}
          size={size}
        />
      </div>
      <SearchField
        aria-label="Search resources"
        className="min-w-0 md:w-64"
        onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
        placeholder="Search by title"
        size={size}
        value={filter.query}
      />
      {perspective === 'coach' && (
        <SortControl
          className="col-span-2 md:w-64"
          onChange={onSortChange}
          options={RESOURCE_SORT_OPTIONS}
          size={size}
          sort={sort}
        />
      )}
    </div>
  );
}
