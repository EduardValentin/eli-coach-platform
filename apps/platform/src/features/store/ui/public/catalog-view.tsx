import { cn } from "@eli-coach-platform/ui";
import { Plus, ShoppingBag } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { StoreProduct } from "~/features/store/contracts/store";

import { useReconcileStoreCartCatalog } from "./cart";
import { useStoreCart } from "./cart-provider";
import { StoreCatalogFilters } from "./catalog-filter-controls";
import {
  collectFilterDimensions,
  filterProducts,
  resolveFilterSelection,
  STORE_GOAL_FILTER_PARAM,
  STORE_TYPE_FILTER_PARAM,
} from "./catalog-filters";

export function CatalogView(props: {
  products: readonly StoreProduct[];
}) {
  const reconcileProducts = useStoreCart(
    (cart) => cart.reconcileProducts,
  );
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);

  // The cart is reconciled against the whole published catalog: a filtered-out
  // resource is still on sale, and must not be dropped from a saved cart.
  useReconcileStoreCartCatalog(
    props.products,
    isCartHydrated,
    reconcileProducts,
  );

  return (
    <CatalogShell>
      <CatalogContent products={props.products} />
    </CatalogShell>
  );
}

export function CatalogUnavailableView() {
  return (
    <CatalogShell>
      <div
        className="rounded-panel border border-border-subtle bg-surface-base p-10 text-center shadow-soft"
        role="alert"
      >
        <ShoppingBag
          aria-hidden="true"
          className="mx-auto mb-5 text-text-muted"
          size={48}
        />
        <h2 className="font-heading text-display-md text-text-primary">
          The store is temporarily unavailable
        </h2>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">
          We couldn&apos;t load the resources right now. Please try again in a
          moment.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center px-3 font-medium text-brand-primary underline underline-offset-4"
          to="/"
        >
          Return home
        </Link>
      </div>
    </CatalogShell>
  );
}

function CatalogShell(props: { children: ReactNode }) {
  return (
    <div className="relative left-1/2 w-dvw max-w-7xl -translate-x-1/2 px-6 pb-24 pt-4">
      <header className="mb-12 max-w-2xl">
        <h1 className="mb-4 font-heading text-4xl tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          Find the right guide
        </h1>
        <p className="text-body-lg text-text-secondary">
          Free workout, nutrition, and wellbeing resources to help you take
          your next step.
        </p>
      </header>
      {props.children}
    </div>
  );
}

function CatalogContent(props: {
  products: readonly StoreProduct[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersRef = useRef<HTMLDivElement>(null);

  if (props.products.length === 0) {
    return <EmptyCatalogView />;
  }

  const dimensions = collectFilterDimensions(props.products);
  const selection = resolveFilterSelection(dimensions, searchParams);
  const filteredProducts = filterProducts(props.products, selection);
  const offersFilters =
    dimensions.types.length > 0 || dimensions.goals.length > 0;

  function applyParams(nextParams: URLSearchParams) {
    // Only a real change earns a history entry, so a repeated choice cannot
    // leave the visitor pressing Back through URLs that all look the same.
    if (nextParams.toString() === searchParams.toString()) {
      return;
    }

    setSearchParams(nextParams, { preventScrollReset: true });
  }

  function selectFilter(name: string, slug: string | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (slug) {
      nextParams.set(name, slug);
    } else {
      nextParams.delete(name);
    }

    applyParams(nextParams);
  }

  function clearFilters() {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete(STORE_TYPE_FILTER_PARAM);
    nextParams.delete(STORE_GOAL_FILTER_PARAM);

    // The button doing this disappears with the empty state it sits in, which
    // would drop focus to the document body. The chips outlive the change, so
    // the pressed one takes it instead.
    filtersRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.focus();
    applyParams(nextParams);
  }

  return (
    <>
      {offersFilters && (
        <>
          <StoreCatalogFilters
            containerRef={filtersRef}
            dimensions={dimensions}
            onSelectGoal={(goal) => selectFilter(STORE_GOAL_FILTER_PARAM, goal)}
            onSelectType={(type) => selectFilter(STORE_TYPE_FILTER_PARAM, type)}
            selection={selection}
          />
          <p className="ui-sr-only" role="status">
            {describeMatchCount(filteredProducts.length)}
          </p>
        </>
      )}
      <CatalogResults
        onClearFilters={clearFilters}
        products={filteredProducts}
      />
    </>
  );
}

function CatalogResults(props: {
  onClearFilters: () => void;
  products: readonly StoreProduct[];
}) {
  if (props.products.length === 0) {
    return (
      <section className="py-20 text-center">
        <p className="text-body-lg font-medium text-text-secondary">
          No products found matching your filters.
        </p>
        <button
          className="mt-6 inline-flex min-h-11 items-center px-3 font-medium text-brand-primary hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
          onClick={props.onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="free-resources-heading">
      <h2
        className="mb-8 border-b border-border-subtle pb-4 font-heading text-display-md text-text-primary"
        id="free-resources-heading"
      >
        Free resources
      </h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {props.products.map((product) => (
          <CatalogProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function EmptyCatalogView() {
  return (
    <section className="py-24 text-center">
      <ShoppingBag
        aria-hidden="true"
        className="mx-auto mb-4 text-text-muted"
        size={64}
      />
      <h2 className="font-heading text-3xl text-text-primary">
        The store is getting ready
      </h2>
      <p className="mx-auto mt-3 max-w-md text-text-secondary">
        New free plans and guides are on the way. Check back soon.
      </p>
    </section>
  );
}

function describeMatchCount(matchCount: number) {
  if (matchCount === 0) {
    return "No resources match your filters.";
  }

  if (matchCount === 1) {
    return "1 resource matches your filters.";
  }

  return `${matchCount} resources match your filters.`;
}

function CatalogProductCard({ product }: { product: StoreProduct }) {
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-stroke-faint bg-surface-base shadow-public-nav transition-shadow hover:shadow-raised">
      <Link
        className="relative block aspect-[4/3] overflow-hidden bg-surface-subtle"
        to={`/store/${product.slug}`}
      >
        <img
          alt={product.cover.alt}
          className="size-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
          src={product.cover.url}
        />
        <span className="absolute right-4 top-4 rounded-pill bg-brand-secondary px-3 py-1.5 text-label uppercase text-brand-secondary-foreground">
          Free
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {product.types.map((type) => (
            <span
              className="rounded-xs bg-brand-secondary-soft px-2 py-1 text-label uppercase text-brand-secondary"
              key={type.slug}
            >
              {type.label}
            </span>
          ))}
        </div>
        <Link to={`/store/${product.slug}`}>
          <h3 className="mb-2 font-heading text-xl font-medium leading-7 text-text-primary transition-colors group-hover:text-brand-secondary">
            {product.title}
          </h3>
        </Link>
        <p className="mb-6 flex-1 text-body-sm text-text-secondary">
          {product.cardSummary}
        </p>
        <button
          aria-label={
            isInCart
              ? `${product.title} is in your cart`
              : `Get ${product.title} for free`
          }
          className={cn(
            "flex min-h-14 w-full items-center justify-center gap-2 rounded-control border-2 px-4 py-3.5 font-medium transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
            {
              "border-brand-secondary bg-brand-secondary text-brand-secondary-foreground":
                isInCart,
              "border-text-primary text-text-primary hover:border-brand-secondary hover:bg-brand-secondary hover:text-brand-secondary-foreground":
                !isInCart,
            },
          )}
          onClick={(event) => {
            addProduct(product.slug);
            openCartFrom(event.currentTarget);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          {isInCart ? "In your cart" : "Get for free"}
        </button>
      </div>
    </article>
  );
}
