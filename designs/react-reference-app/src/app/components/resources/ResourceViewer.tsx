import { useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import {
  hasPagePreview,
  pageCountOf,
  type Resource,
} from '../../domain/resources';
import { formatJourneyDate } from '../../utils/journeyLabels';
import {
  formatFileSize,
  RESOURCE_KIND_LABELS,
} from '../../utils/resourceLabels';
import { Reading } from '../Reading';
import { ZoomableImage } from '../ZoomableImage';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../ui/dialog';
import { useIsDesktop } from '../ui/use-desktop';
import { cn } from '../ui/utils';
import type { ResourceManagement } from './ResourceActionsMenu';
import { ResourceFileCover } from './ResourceFileCover';

type PageStep = -1 | 1;

const STAGE_CLASS =
  'flex shrink-0 flex-col bg-surface-subtle lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:h-auto lg:min-h-0';

function pageAlt(resource: Resource, page: number): string {
  return pageCountOf(resource) > 1
    ? `${resource.title}, page ${page + 1}`
    : resource.title;
}

function PageStage({
  resource,
  page,
  step,
  onTurn,
}: {
  resource: Resource;
  page: number;
  step: PageStep;
  onTurn: (step: PageStep) => void;
}) {
  const reduceMotion = useReducedMotion() === true;
  const pageCount = pageCountOf(resource);
  const paged = pageCount > 1;

  return (
    <div className={cn(STAGE_CLASS, 'h-[min(58dvh,34rem)]')} data-parity="viewer-stage">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-0 flex-1"
        initial={reduceMotion ? false : { opacity: 0, x: step * 32 }}
        key={page}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <ZoomableImage
          alt={pageAlt(resource, page)}
          className="flex-1 p-4 sm:p-6 lg:p-8"
          imageClassName="rounded-tile border border-border-subtle bg-surface-base shadow-card"
          onSwipeLeft={() => onTurn(1)}
          onSwipeRight={() => onTurn(-1)}
          parity={{ stage: 'viewer-page-stage', image: 'viewer-page' }}
          src={resource.pageImageUrls[page]}
        />
      </motion.div>

      {paged && (
        <div className="flex items-center justify-center gap-3 pb-3 lg:pb-4">
          <Button
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => onTurn(-1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span
            aria-hidden="true"
            className="min-w-14 text-center text-sm font-medium text-text-primary tabular-nums"
            data-parity="viewer-counter"
          >
            {page + 1} / {pageCount}
          </span>
          <Button
            aria-label="Next page"
            disabled={page === pageCount - 1}
            onClick={() => onTurn(1)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CoverStage({ resource }: { resource: Resource }) {
  return (
    <div className={cn(STAGE_CLASS, 'h-56')} data-parity="viewer-stage">
      <ResourceFileCover
        fileName={resource.file.name}
        kind={resource.file.kind}
        placement="stage"
      />
    </div>
  );
}

function ResourceDetailsPanel({
  resource,
  management,
}: {
  resource: Resource;
  management?: ResourceManagement;
}) {
  const { file } = resource;

  return (
    <div
      className="flex flex-col gap-5 px-4 py-5 sm:px-6 lg:col-start-2 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-border-subtle"
      data-parity="viewer-details"
    >
      {resource.description && (
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary">
          {resource.description}
        </p>
      )}
      {resource.tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <li key={tag}>
              <Badge tone="brand-secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Reading as="dl-item" label="Type" value={RESOURCE_KIND_LABELS[file.kind].long} />
        {file.kind === 'pdf' && (
          <Reading as="dl-item" label="Pages" value={pageCountOf(resource)} />
        )}
        <Reading as="dl-item" label="Size" value={formatFileSize(file.sizeBytes)} />
        <Reading as="dl-item" label="Added" value={formatJourneyDate(resource.addedAt)} />
      </dl>
      {management && (
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={management.onEdit}
            size="sm"
            type="button"
            variant="outline"
          >
            Edit details
          </Button>
          <Button
            className="flex-1"
            onClick={management.onDelete}
            size="sm"
            type="button"
            variant="destructive-outline"
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function ViewerContent({
  resource,
  management,
  onDownload,
}: {
  resource: Resource;
  management?: ResourceManagement;
  onDownload: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [page, setPage] = useState(0);
  const [step, setStep] = useState<PageStep>(1);
  const [announcement, setAnnouncement] = useState('');
  const pageCount = pageCountOf(resource);

  const turn = (direction: PageStep) => {
    const next = page + direction;
    if (next < 0 || next >= pageCount) return;

    setStep(direction);
    setPage(next);
    setAnnouncement(`Page ${next + 1} of ${pageCount}`);
  };

  const turnWithArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction: Partial<Record<string, PageStep>> = { ArrowLeft: -1, ArrowRight: 1 };
    const chosen = direction[event.key];
    if (!chosen || pageCount < 2) return;

    event.preventDefault();
    turn(chosen);
  };

  return (
    <DialogContent
      aria-describedby={undefined}
      data-parity-root="ResourceViewer"
      onKeyDown={turnWithArrowKeys}
      size="viewer"
    >
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex items-center gap-2 border-b border-border-subtle px-2 py-2 sm:px-4 lg:col-span-2 lg:gap-4 lg:py-3 lg:pr-3 lg:pl-6">
          <DialogClose asChild>
            <Button
              aria-label="Close"
              className="lg:order-last"
              size="icon-md"
              type="button"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" className="lg:hidden" />
              <X aria-hidden="true" className="hidden lg:block" />
            </Button>
          </DialogClose>
          <DialogTitle className="min-w-0 flex-1 truncate text-base leading-normal font-semibold text-text-primary">
            {resource.title}
          </DialogTitle>
        </div>

        <div className="min-h-0 overflow-y-auto lg:contents">
          {hasPagePreview(resource.file.kind) ? (
            <PageStage onTurn={turn} page={page} resource={resource} step={step} />
          ) : (
            <CoverStage resource={resource} />
          )}
          <ResourceDetailsPanel management={management} resource={resource} />
        </div>

        <div className="border-t border-border-subtle bg-surface-base px-4 py-3 sm:px-6 lg:col-start-2 lg:row-start-3 lg:border-l lg:py-4">
          <Button
            className="w-full"
            onClick={onDownload}
            size={isDesktop ? 'sm' : 'md'}
            type="button"
            variant="primary"
          >
            <Download aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </DialogContent>
  );
}

export function ResourceViewer({
  resource,
  management,
  onDownload,
  onClose,
}: {
  resource: Resource | undefined;
  management?: ResourceManagement;
  onDownload: (resource: Resource) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={resource !== undefined}
    >
      {resource && (
        <ViewerContent
          key={resource.id}
          management={management}
          onDownload={() => onDownload(resource)}
          resource={resource}
        />
      )}
    </Dialog>
  );
}
