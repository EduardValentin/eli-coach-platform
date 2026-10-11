import { useClientReducedMotionPreference } from "@eli-coach-platform/ui/motion";
import {
  ViewerDialog,
  ViewerDialogClose,
  ViewerDialogContent,
  ViewerDialogTitle,
  ZoomableImage,
} from "@eli-coach-platform/ui/overlays";
import {
  cn,
  formatDayMonth,
  useCalendarDayTimeZone,
  useIsDesktopViewport,
} from "@eli-coach-platform/ui/lib";
import { Reading } from "@eli-coach-platform/ui/portal";
import {
  Badge,
  Button,
  buttonVariants,
} from "@eli-coach-platform/ui/primitives";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import type { ClientResourceView } from "~/features/client-resources/public/client-resources";

import { formatFileSize, RESOURCE_KIND_LABELS } from "./resource-copy";
import { ResourceFileCover } from "./resource-file-cover";
import { resourceDownloadUrl, resourcePageUrl } from "./resource-urls";

type PageStep = -1 | 1;

const PAGE_STEP_BY_KEY: ReadonlyMap<string, PageStep> = new Map([
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
]);

const FIRST_PAGE = 1;

const STAGE_CLASS =
  "flex shrink-0 flex-col bg-surface-subtle lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:h-auto lg:min-h-0";

function pageCountOf(resource: ClientResourceView): number {
  return resource.file.pageCount ?? 0;
}

function pageAlt(resource: ClientResourceView, pageNumber: number): string {
  return pageCountOf(resource) > 1
    ? `${resource.title}, page ${pageNumber}`
    : resource.title;
}

function usePageControlsKeepingFocus(pageNumber: number, pageCount: number) {
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (
      pageNumber === FIRST_PAGE &&
      document.activeElement === previous.current
    ) {
      next.current?.focus();
    }
    if (pageNumber === pageCount && document.activeElement === next.current) {
      previous.current?.focus();
    }
  }, [pageNumber, pageCount]);

  return { previous, next };
}

type PageStageProps = {
  resource: ClientResourceView;
  pageNumber: number;
  step: PageStep;
  onTurn: (step: PageStep) => void;
};

function PageStage({ resource, pageNumber, step, onTurn }: PageStageProps) {
  const reduceMotion = useClientReducedMotionPreference();
  const pageCount = pageCountOf(resource);
  const controls = usePageControlsKeepingFocus(pageNumber, pageCount);

  return (
    <div
      className={cn(STAGE_CLASS, "h-[min(58dvh,34rem)]")}
      data-parity="viewer-stage"
    >
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-0 flex-1"
        initial={reduceMotion ? false : { opacity: 0, x: step * 32 }}
        key={pageNumber}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ZoomableImage
          alt={pageAlt(resource, pageNumber)}
          className="flex-1 p-4 sm:p-6 lg:p-8"
          imageClassName="rounded-tile border border-border-subtle bg-surface-base shadow-card"
          onSwipeLeft={() => onTurn(1)}
          onSwipeRight={() => onTurn(-1)}
          parity={{ stage: "viewer-page-stage", image: "viewer-page" }}
          src={resourcePageUrl(resource.id, pageNumber)}
        />
      </motion.div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pb-3 lg:pb-4">
          <Button
            aria-label="Previous page"
            disabled={pageNumber === FIRST_PAGE}
            onClick={() => onTurn(-1)}
            ref={controls.previous}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span
            aria-hidden="true"
            className="min-w-14 text-center text-sm font-medium text-text-primary tabular-nums"
            data-parity="viewer-counter"
          >
            {pageNumber} / {pageCount}
          </span>
          <Button
            aria-label="Next page"
            disabled={pageNumber === pageCount}
            onClick={() => onTurn(1)}
            ref={controls.next}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CoverStage({ resource }: { resource: ClientResourceView }) {
  return (
    <div className={cn(STAGE_CLASS, "h-56")} data-parity="viewer-stage">
      <ResourceFileCover
        fileName={resource.file.downloadName}
        kind={resource.file.kind}
        placement="stage"
      />
    </div>
  );
}

type ResourceDetailsPanelProps = {
  resource: ClientResourceView;
  actions?: ReactNode;
};

function ResourceDetailsPanel({
  resource,
  actions,
}: ResourceDetailsPanelProps) {
  const timeZone = useCalendarDayTimeZone();
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
        <ul
          aria-label="Tags"
          className="flex flex-wrap gap-1.5"
          data-parity="viewer-tags"
        >
          {resource.tags.map((tag) => (
            <li key={tag}>
              <Badge tone="brand-secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Reading
          as="dl-item"
          label="Type"
          value={RESOURCE_KIND_LABELS[file.kind].long}
        />
        {file.kind === "pdf" && (
          <Reading as="dl-item" label="Pages" value={pageCountOf(resource)} />
        )}
        <Reading
          as="dl-item"
          label="Size"
          value={formatFileSize(file.sizeBytes)}
        />
        <Reading
          as="dl-item"
          label="Added"
          value={formatDayMonth(resource.addedAt, timeZone)}
        />
      </dl>
      {actions}
    </div>
  );
}

type ViewerContentProps = {
  resource: ClientResourceView;
  actions?: ReactNode;
  returnFocusTo?: RefObject<HTMLElement | null>;
};

function ViewerContent({
  resource,
  actions,
  returnFocusTo,
}: ViewerContentProps) {
  const isDesktop = useIsDesktopViewport();
  const [pageNumber, setPageNumber] = useState(FIRST_PAGE);
  const [step, setStep] = useState<PageStep>(1);
  const [announcement, setAnnouncement] = useState("");
  const pageCount = pageCountOf(resource);

  const turn = (direction: PageStep) => {
    const next = pageNumber + direction;
    if (next < FIRST_PAGE || next > pageCount) return;

    setStep(direction);
    setPageNumber(next);
    setAnnouncement(`Page ${next} of ${pageCount}`);
  };

  const turnWithArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = PAGE_STEP_BY_KEY.get(event.key);
    if (!direction || pageCount < 2) return;

    event.preventDefault();
    turn(direction);
  };

  return (
    <ViewerDialogContent
      data-parity-root="ResourceViewer"
      onKeyDown={turnWithArrowKeys}
      returnFocusTo={returnFocusTo}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 items-center gap-2 border-b border-border-subtle px-2 py-2 sm:px-4 lg:col-span-2 lg:gap-4 lg:py-3 lg:pr-3 lg:pl-6">
          <ViewerDialogClose asChild>
            <Button
              aria-label="Close"
              className="lg:order-last"
              size="icon-md"
              variant="ghost"
            >
              <ArrowLeft aria-hidden="true" className="lg:hidden" />
              <X aria-hidden="true" className="hidden lg:block" />
            </Button>
          </ViewerDialogClose>
          <ViewerDialogTitle className="min-w-0 flex-1 truncate text-base leading-normal font-semibold text-text-primary">
            {resource.title}
          </ViewerDialogTitle>
        </div>

        <div className="min-h-0 overflow-y-auto lg:contents">
          {resource.file.pageCount === null ? (
            <CoverStage resource={resource} />
          ) : (
            <PageStage
              onTurn={turn}
              pageNumber={pageNumber}
              resource={resource}
              step={step}
            />
          )}
          <ResourceDetailsPanel actions={actions} resource={resource} />
        </div>

        <div className="border-t border-border-subtle bg-surface-base px-4 py-3 sm:px-6 lg:col-start-2 lg:row-start-3 lg:border-l lg:py-4">
          <a
            className={buttonVariants({
              className: "w-full",
              size: isDesktop ? "sm" : "md",
              variant: "primary",
            })}
            data-parity="viewer-download"
            download={resource.file.downloadName}
            href={resourceDownloadUrl(resource.id)}
          >
            <Download aria-hidden="true" size={16} />
            Download
          </a>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </ViewerDialogContent>
  );
}

type ResourceViewerProps = {
  resource: ClientResourceView | undefined;
  onClose: () => void;
  actions?: ReactNode;
  returnFocusTo?: RefObject<HTMLElement | null>;
};

export function ResourceViewer({
  resource,
  onClose,
  actions,
  returnFocusTo,
}: ResourceViewerProps) {
  return (
    <ViewerDialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={resource !== undefined}
    >
      {resource && (
        <ViewerContent
          actions={actions}
          key={resource.id}
          resource={resource}
          returnFocusTo={returnFocusTo}
        />
      )}
    </ViewerDialog>
  );
}
