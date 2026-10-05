import { useId, type ReactNode } from 'react';
import {
  isUnopened,
  pageCountOf,
  thumbnailUrlOf,
  type Resource,
} from '../../domain/resources';
import { pageCountLabel, RESOURCE_KIND_LABELS } from '../../utils/resourceLabels';
import { Badge } from '../ui/badge';
import { cardVariants } from '../ui/card';
import { cn } from '../ui/utils';
import { ResourceFileCover } from './ResourceFileCover';

export type ResourcePerspective = 'coach' | 'client';

const SHOWN_TAGS = 2;

function TagPreview({ tags, id }: { tags: readonly string[]; id: string }) {
  const hidden = tags.length - SHOWN_TAGS;

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1 self-start px-0.5" id={id}>
      {tags.slice(0, SHOWN_TAGS).map((tag) => (
        <Badge className="max-w-full" key={tag} tone="brand-secondary">
          <span className="truncate">{tag}</span>
        </Badge>
      ))}
      {hidden > 0 && (
        <span className="text-sm text-text-secondary" data-parity="resource-more-tags">
          +{hidden}
        </span>
      )}
    </span>
  );
}

export function ResourceCard({
  resource,
  perspective,
  onOpen,
  menu,
}: {
  resource: Resource;
  perspective: ResourcePerspective;
  onOpen: () => void;
  menu?: ReactNode;
}) {
  const titleId = useId();
  const metaId = useId();
  const tagsId = useId();
  const { file, tags } = resource;
  const showsNew = perspective === 'client' && isUnopened(resource);
  const hasTags = tags.length > 0;
  const thumbnail = thumbnailUrlOf(resource);
  const pageCount = pageCountOf(resource);

  return (
    <li
      className="grid grid-rows-[auto_auto_auto_1fr] gap-y-2.5"
      data-parity="resource-card"
    >
      <button
        aria-describedby={hasTags ? `${metaId} ${tagsId}` : metaId}
        aria-labelledby={titleId}
        className={cn(
          cardVariants({ variant: 'card' }),
          'col-start-1 row-span-4 row-start-1 grid grid-rows-subgrid p-2.5 text-left transition-shadow hover:shadow-raised sm:p-3',
        )}
        onClick={onOpen}
        type="button"
      >
        <span
          className="block aspect-3/4 w-full overflow-hidden rounded-field border border-border-subtle bg-surface-subtle"
          data-parity="resource-thumbnail"
        >
          {thumbnail === null ? (
            <ResourceFileCover kind={file.kind} placement="thumbnail" />
          ) : (
            <img
              alt=""
              className="size-full object-cover object-top"
              loading="lazy"
              src={thumbnail}
            />
          )}
        </span>
        <span
          className={cn('flex min-h-6 items-center gap-1.5 px-0.5', { 'pr-10': menu })}
          id={metaId}
        >
          <Badge tone="muted">{RESOURCE_KIND_LABELS[file.kind].short}</Badge>
          {pageCount > 1 && (
            <span
              className="text-sm whitespace-nowrap text-text-secondary tabular-nums"
              data-parity="resource-pages"
            >
              {pageCountLabel(pageCount)}
            </span>
          )}
          {showsNew && (
            <Badge className="ml-auto" tone="pending">
              New
            </Badge>
          )}
        </span>
        <span
          className="line-clamp-2 px-0.5 text-sm font-medium text-text-primary"
          id={titleId}
        >
          {resource.title}
        </span>
        {hasTags && <TagPreview id={tagsId} tags={tags} />}
      </button>
      {menu && (
        <div className="col-start-1 row-start-2 -my-2 mr-1 self-center justify-self-end sm:mr-1.5">
          {menu}
        </div>
      )}
    </li>
  );
}
