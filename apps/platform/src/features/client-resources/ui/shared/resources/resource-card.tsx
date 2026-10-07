import { cn } from "@eli-coach-platform/ui/lib";
import { Badge, cardVariants } from "@eli-coach-platform/ui/primitives";
import { useId, type ReactNode } from "react";

import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";

import { pageCountLabel, RESOURCE_KIND_LABELS } from "./resource-copy";
import { ResourceFileCover } from "./resource-file-cover";
import { resourceThumbnailUrl } from "./resource-urls";

export type ResourcePerspective = "coach" | "client";

type ResourceCardProps = {
  resource: ClientResourceView;
  perspective: ResourcePerspective;
  unopened: boolean;
  onOpen: () => void;
  menu?: ReactNode;
};

export function ResourceCard({
  resource,
  perspective,
  unopened,
  onOpen,
  menu,
}: ResourceCardProps) {
  const titleId = useId();
  const metaId = useId();
  const { file } = resource;
  const showsNew = perspective === "client" && unopened;

  return (
    <li
      className="grid grid-rows-[auto_auto_auto_1fr] gap-y-2.5"
      data-parity="resource-card"
    >
      <button
        aria-describedby={metaId}
        aria-labelledby={titleId}
        className={cn(
          cardVariants({ variant: "card" }),
          "col-start-1 row-span-4 row-start-1 grid grid-rows-subgrid p-2.5 text-left transition-shadow hover:shadow-raised sm:p-3",
        )}
        onClick={onOpen}
        type="button"
      >
        <span
          className="block aspect-3/4 w-full overflow-hidden rounded-field border border-border-subtle bg-surface-subtle"
          data-parity="resource-thumbnail"
        >
          {file.pageCount === null ? (
            <ResourceFileCover kind={file.kind} placement="thumbnail" />
          ) : (
            <img
              alt=""
              className="size-full object-cover object-top"
              loading="lazy"
              src={resourceThumbnailUrl(resource.id)}
            />
          )}
        </span>
        <span
          className={cn("flex min-h-6 items-center gap-1.5 px-0.5", {
            "pr-10": menu !== undefined,
          })}
          id={metaId}
        >
          <Badge tone="muted">{RESOURCE_KIND_LABELS[file.kind].short}</Badge>
          {file.pageCount !== null && file.pageCount > 1 && (
            <span
              className="text-sm whitespace-nowrap text-text-secondary tabular-nums"
              data-parity="resource-pages"
            >
              {pageCountLabel(file.pageCount)}
            </span>
          )}
          {showsNew && (
            <Badge
              className="ml-auto"
              data-parity="resource-new"
              tone="pending"
            >
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
      </button>
      {menu !== undefined && (
        <div
          className="col-start-1 row-start-2 -my-2 mr-1 self-center justify-self-end sm:mr-1.5"
          data-parity="resource-menu"
        >
          {menu}
        </div>
      )}
    </li>
  );
}
