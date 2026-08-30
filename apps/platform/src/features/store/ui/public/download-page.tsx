import { Button } from "@eli-coach-platform/ui";
import { ArrowRight, Download, LinkIcon } from "lucide-react";
import { Link, type MetaFunction } from "react-router";

import {
  DOWNLOAD_API_URL,
  usePrivateDownloadToken,
} from "./download-state";

export const meta: MetaFunction = () => [
  { title: "Your Resources | Free Resources | Evoa" },
  {
    name: "description",
    content:
      "Download the free resources you requested from Evoa.",
  },
];

export default function DownloadRoute() {
  const token = usePrivateDownloadToken();

  if (token === null) {
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

  if (!token) {
    return <UnavailableDownload />;
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="font-heading text-display-lg tracking-tight text-text-primary">
        Your resources
      </h1>
      <p className="mt-4 text-body-lg text-text-secondary">
        Everything you requested is ready. Your private link can be reused for
        seven days after the request.
      </p>
      <div className="my-10 rounded-panel border border-border-subtle bg-surface-base p-8 shadow-soft">
        <span className="mx-auto flex size-16 items-center justify-center rounded-pill bg-brand-primary-soft text-brand-primary">
          <Download aria-hidden="true" size={30} />
        </span>
        <h2 className="mt-5 text-center font-heading text-display-sm text-text-primary">
          One secure download
        </h2>
        <p className="mt-2 text-center text-body-sm text-text-secondary">
          Single files download directly. Multiple resources arrive together
          in a ZIP file.
        </p>
      </div>
      <form action={DOWNLOAD_API_URL} method="post">
        <input name="token" type="hidden" value={token} />
        <Button className="w-full" size="lg" type="submit" variant="primary">
          <Download aria-hidden="true" size={21} />
          Download your resources
        </Button>
      </form>
      <p className="mt-6 text-center text-body-sm text-text-secondary">
        Need something else?{" "}
        <Link
          className="-mx-2 inline-flex min-h-11 items-center px-2 text-brand-primary underline underline-offset-2"
          to="/store"
        >
          Browse the store
        </Link>
        .
      </p>
    </div>
  );
}

function UnavailableDownload() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center">
      <span className="mb-5 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-text-muted">
        <LinkIcon aria-hidden="true" size={36} />
      </span>
      <h1 className="font-heading text-display-md tracking-tight text-text-primary">
        This link is no longer available
      </h1>
      <p className="mt-4 max-w-md text-text-secondary">
        Download links stay active for seven days after each request. You can
        request your resources again from the store.
      </p>
      <Link
        className="mt-7 inline-flex items-center gap-2 rounded-pill bg-surface-inverted px-7 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary"
        to="/store"
      >
        Back to the store
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </div>
  );
}
