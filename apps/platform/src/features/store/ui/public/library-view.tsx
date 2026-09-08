import { cn, Skeleton } from "@eli-coach-platform/ui";
import { BookOpen, Download, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import type { StoreProduct } from "~/features/store/contracts/store";

import { downloadOwnedProduct } from "./owned-product-download";

export type LibraryContent =
  | { products: readonly StoreProduct[]; status: "loaded" }
  | { status: "unavailable" };

type LibraryViewProps = {
  content: LibraryContent;
  isReloading: boolean;
  onRetry: () => void;
};

// Supporting copy: the surface showing either message states the failure
// itself, so neither repeats it.
const LOAD_FAILURE_MESSAGE =
  "Your products are safe — this one is on our end. Please try again in a moment.";
const DOWNLOAD_FAILURE_MESSAGE =
  "We couldn't prepare your download right now. Please try again.";

// The empty and failed states stand in for the product list, so they sit in
// the same card the products would have filled rather than loose on the page.
const STATE_CARD_CLASS =
  "flex flex-col items-center gap-4 rounded-md border border-stroke-faint bg-surface-base px-6 py-16 text-center shadow-public-nav";
const STATE_CARD_ICON_CLASS =
  "mb-2 flex size-20 items-center justify-center rounded-pill bg-surface-subtle text-copy-muted";
const STATE_CARD_HEADING_CLASS =
  "font-heading text-3xl font-medium tracking-tight text-text-primary md:text-4xl";
const STATE_CARD_COPY_CLASS = "max-w-md leading-copy-relaxed text-copy-muted";
const STATE_CARD_ACTION_CLASS =
  "mt-6 inline-flex items-center justify-center gap-2 rounded-control bg-surface-inverted px-8 py-4 font-medium text-text-inverted transition-colors hover:bg-brand-primary";
const PRODUCT_CARD_CLASS =
  "rounded-md border border-stroke-faint bg-surface-base p-5 shadow-public-nav";

const SKELETON_ROW_KEYS = ["first", "second", "third"] as const;

export function LibraryView(props: LibraryViewProps) {
  const { content, isReloading, onRetry } = props;

  // The header belongs to a Library that has something to show. The empty and
  // failed states each state their own case and take the page heading with it;
  // a reload keeps the header because the outcome is not known yet.
  if (isReloading) {
    return (
      <LibraryStage>
        <LibraryHeader />
        <LibraryLoadingRows />
      </LibraryStage>
    );
  }

  if (content.status === "unavailable") {
    return (
      <LibraryStage>
        <LibraryUnavailableCard onRetry={onRetry} />
      </LibraryStage>
    );
  }

  if (content.products.length === 0) {
    return (
      <LibraryStage>
        <LibraryEmptyCard />
      </LibraryStage>
    );
  }

  return (
    <LibraryStage>
      <LibraryHeader />
      <OwnedProductList products={content.products} />
    </LibraryStage>
  );
}

function LibraryStage(props: { children: ReactNode }) {
  // The public shell's `<main>` already carries most of the offset below the
  // fixed nav; what is left of it, and the page's own breathing room, sit here.
  return <div className="mx-auto max-w-3xl pb-8 pt-12">{props.children}</div>;
}

function LibraryHeader() {
  return (
    <>
      <h1 className="mb-4 font-heading text-4xl font-medium tracking-tight text-text-primary md:text-5xl">
        Your Library
      </h1>
      <p className="mb-10 text-lg text-copy-muted">
        Every product you own, ready to download again whenever you need it.
      </p>
    </>
  );
}

function LibraryLoadingRows() {
  return (
    <div>
      <p className="ui-sr-only" role="status">
        Loading your Library
      </p>
      <ul aria-hidden="true" className="space-y-4">
        {SKELETON_ROW_KEYS.map((rowKey) => (
          <li className={cn(PRODUCT_CARD_CLASS, "flex items-center gap-4")} key={rowKey}>
            <Skeleton className="size-16 shrink-0 rounded-thumbnail" />
            <div className="grow space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-10 w-28 rounded-control" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LibraryUnavailableCard(props: { onRetry: () => void }) {
  return (
    <div className={STATE_CARD_CLASS} role="alert">
      <div className={STATE_CARD_ICON_CLASS}>
        <RefreshCw aria-hidden="true" size={36} />
      </div>
      <h1 className={STATE_CARD_HEADING_CLASS}>We couldn&apos;t load your Library</h1>
      <p className={STATE_CARD_COPY_CLASS}>{LOAD_FAILURE_MESSAGE}</p>
      <button className={STATE_CARD_ACTION_CLASS} onClick={props.onRetry} type="button">
        Try again
      </button>
    </div>
  );
}

function LibraryEmptyCard() {
  return (
    <div className={STATE_CARD_CLASS}>
      <div className={STATE_CARD_ICON_CLASS}>
        <BookOpen aria-hidden="true" size={36} />
      </div>
      <h1 className={STATE_CARD_HEADING_CLASS}>Nothing in your Library yet</h1>
      <p className={STATE_CARD_COPY_CLASS}>
        Products you purchase or request appear here, ready to download whenever
        you need them.
      </p>
      <Link className={STATE_CARD_ACTION_CLASS} to="/store">
        Browse the Store
      </Link>
    </div>
  );
}

function OwnedProductList(props: { products: readonly StoreProduct[] }) {
  // Every row's download runs independently, so preparing and refused state is
  // keyed by product rather than held as one "current download" that rows
  // would overwrite for each other.
  const [preparingSlugs, setPreparingSlugs] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [refusedSlugs, setRefusedSlugs] = useState<ReadonlySet<string>>(
    new Set(),
  );

  async function prepareDownload(product: StoreProduct) {
    setPreparingSlugs(including(product.slug));
    setRefusedSlugs(excluding(product.slug));

    try {
      await downloadOwnedProduct(product.slug);
    } catch {
      setRefusedSlugs(including(product.slug));
    } finally {
      setPreparingSlugs(excluding(product.slug));
    }
  }

  return (
    <ul className="space-y-4">
      {props.products.map((product) => (
        <OwnedProductRow
          isPreparing={preparingSlugs.has(product.slug)}
          key={product.slug}
          onDownload={() => void prepareDownload(product)}
          product={product}
          wasRefused={refusedSlugs.has(product.slug)}
        />
      ))}
    </ul>
  );
}

function OwnedProductRow(props: {
  isPreparing: boolean;
  onDownload: () => void;
  product: StoreProduct;
  wasRefused: boolean;
}) {
  const { isPreparing, onDownload, product, wasRefused } = props;

  return (
    <li className={PRODUCT_CARD_CLASS}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          alt=""
          className="size-16 shrink-0 rounded-thumbnail object-cover"
          src={product.cover.url}
        />
        <div className="min-w-0 grow">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-medium text-text-primary">
              {product.title}
            </h2>
            {/* Everything in the Store is free today, so every owned product
                carries the same badge. */}
            <span className="rounded-control bg-brand-secondary-soft px-2 py-1 text-chip-label uppercase text-brand-secondary">
              Free
            </span>
          </div>
          <p className="text-xs uppercase tracking-caps-label text-copy-muted">
            {describeCatalogLabels(product)}
          </p>
        </div>
        <button
          aria-busy={isPreparing}
          aria-label={`Download ${product.title}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-control bg-brand-primary px-5 py-3 font-medium text-brand-primary-foreground transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
          disabled={isPreparing}
          onClick={onDownload}
          type="button"
        >
          <Download aria-hidden="true" size={18} />
          {isPreparing ? "Preparing…" : "Download"}
        </button>
      </div>
      {wasRefused ? (
        <p className="mt-3 text-sm text-feedback-danger" role="alert">
          {DOWNLOAD_FAILURE_MESSAGE}
        </p>
      ) : null}
    </li>
  );
}

function describeCatalogLabels(product: StoreProduct): string {
  return [...product.types, ...product.goals]
    .map((taxonomyValue) => taxonomyValue.label)
    .join(" · ");
}

function including(slug: string) {
  return (slugs: ReadonlySet<string>) => new Set(slugs).add(slug);
}

function excluding(slug: string) {
  return (slugs: ReadonlySet<string>) => {
    const remaining = new Set(slugs);
    remaining.delete(slug);

    return remaining;
  };
}
