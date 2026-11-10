import { DeadEndLink } from "~/shared/design-system/layout";
import { cn } from "~/shared/design-system/lib";
import { Button, cardVariants } from "~/shared/design-system/primitives";
import { Download, FileText, LinkIcon } from "lucide-react";
import { Link, type MetaFunction } from "react-router";

import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import type { StoreDownloadResource } from "~/bounded-contexts/sales/store/public/store";

import {
  useStoreDownloadContentsFetcher,
  type StoreDownloadContents,
} from "../api-client";
import { DOWNLOAD_API_URL, usePrivateDownloadToken } from "./download-state";

export const meta: MetaFunction = () => [
  { title: "Your Resources | Store | Evoa" },
  {
    name: "description",
    content: "Download the resources you requested from Evoa.",
  },
];

export const handle = { publicContentFrame: "full-bleed" } as const;

export default function DownloadRoute() {
  const token = usePrivateDownloadToken();
  const contents = useStoreDownloadContentsFetcher(token);

  return (
    <div
      className="min-h-screen w-full bg-surface-page pb-24"
      data-parity-root="DownloadPage"
    >
      <div className="mx-auto max-w-2xl px-6 pt-32">
        <DownloadState contents={contents} token={token} />
      </div>
    </div>
  );
}

function DownloadState({
  contents,
  token,
}: {
  contents: StoreDownloadContents;
  token: string | null;
}) {
  if (token === "") {
    return <UnavailableDownload />;
  }

  if (token === null || contents.status === "loading") {
    return <PreparingDownload />;
  }

  if (contents.status === "unavailable") {
    return <UnavailableDownload />;
  }

  return (
    <ReadyDownload
      resources={contents.status === "available" ? contents.resources : []}
      token={token}
    />
  );
}

function PreparingDownload() {
  return (
    <div aria-busy="true" className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="font-heading text-display-md text-text-primary">
        Preparing your resources
      </h1>
      <p className="mt-3 text-text-secondary">
        Checking your private download link…
      </p>
    </div>
  );
}

function ReadyDownload({
  resources,
  token,
}: {
  resources: readonly StoreDownloadResource[];
  token: string;
}) {
  return (
    <div className="py-8">
      <h1 className="mb-4 font-heading text-4xl tracking-tight text-text-primary md:text-5xl">
        Your resources
      </h1>
      <p className="mb-10 text-lg text-copy-muted">
        Everything you requested is ready. Your download stays available for
        seven days after each request.
      </p>
      {resources.length > 0 && <DownloadResources resources={resources} />}
      <form action={DOWNLOAD_API_URL} method="post">
        <input name="token" type="hidden" value={token} />
        <Button
          elevation="raised"
          size="lg"
          textSize="lg"
          type="submit"
          width="full"
        >
          <Download aria-hidden="true" size={21} />
          Download your resources
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-copy-muted">
        Need something else?{" "}
        <Link
          className="-mx-2 inline-flex min-h-11 items-center px-2 text-brand-primary underline underline-offset-2"
          to={STORE_PATH}
        >
          Browse the store
        </Link>
        .
      </p>
    </div>
  );
}

function DownloadResources({
  resources,
}: {
  resources: readonly StoreDownloadResource[];
}) {
  return (
    <ul
      className={cn(cardVariants(), "mb-10 divide-y divide-stroke-faint")}
      data-parity="download-resources"
    >
      {resources.map((resource, position) => (
        <li
          className="flex items-center gap-4 p-5"
          data-parity="download-resource"
          key={`${position}-${resource.title}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-compact bg-brand-primary-soft text-brand-primary">
            <FileText aria-hidden="true" size={20} />
          </span>
          <span className="flex flex-col">
            <span
              className="font-medium text-text-primary"
              data-parity="download-resource-title"
            >
              {resource.title}
            </span>
            {resource.typeLabels.length > 0 && (
              <span
                className="text-xs uppercase tracking-wider text-copy-muted"
                data-parity="download-resource-type"
              >
                {resource.typeLabels.join(", ")}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UnavailableDownload() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <span className="mb-5 flex size-20 items-center justify-center rounded-full bg-surface-subtle text-text-muted">
        <LinkIcon aria-hidden="true" size={36} />
      </span>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        This link is no longer available
      </h1>
      <p className="mt-4 max-w-md text-text-secondary">
        Download links stay active for seven days after each request. You can
        request your resources again from the store.
      </p>
      <DeadEndLink className="mt-7" direction="back" to={STORE_PATH}>
        Back to the store
      </DeadEndLink>
    </div>
  );
}
