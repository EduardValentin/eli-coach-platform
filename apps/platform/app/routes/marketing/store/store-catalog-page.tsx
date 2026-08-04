import type { StoreProduct } from "@eli-coach-platform/contracts";
import { cn } from "@eli-coach-platform/ui";
import { Plus, ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

import { useStoreCart } from "./store-cart";
import { useStoreCatalogQuery } from "./store-query";

export function StoreCatalogPage() {
  const catalogQuery = useStoreCatalogQuery();
  const reconcileProducts = useStoreCart(
    (cart) => cart.reconcileProducts,
  );
  const products = catalogQuery.data ?? [];

  useEffect(() => {
    if (catalogQuery.data) {
      reconcileProducts(
        catalogQuery.data.map((product) => product.slug),
      );
    }
  }, [catalogQuery.data, reconcileProducts]);

  return (
    <div className="mx-auto w-full max-w-7xl pb-24">
      <header className="mb-12 max-w-2xl">
        <h1 className="mb-4 font-heading text-display-lg tracking-tight text-text-primary">
          Find the right guide
        </h1>
        <p className="text-body-lg text-text-secondary">
          Free workout, nutrition, and wellbeing resources to help you take
          your next step.
        </p>
      </header>
      <CatalogContent
        isError={catalogQuery.isError}
        isPending={catalogQuery.isPending}
        products={products}
      />
    </div>
  );
}

function CatalogContent(props: {
  isError: boolean;
  isPending: boolean;
  products: readonly StoreProduct[];
}) {
  if (props.isPending) {
    return (
      <section aria-busy="true" aria-label="Loading free resources">
        <h2 className="ui-sr-only">Loading free resources</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              aria-hidden="true"
              className="h-96 animate-pulse rounded-panel bg-surface-subtle motion-reduce:animate-none"
              key={item}
            />
          ))}
        </div>
      </section>
    );
  }

  if (props.isError) {
    return (
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
    );
  }

  if (props.products.length === 0) {
    return (
      <section className="py-20 text-center">
        <ShoppingBag
          aria-hidden="true"
          className="mx-auto mb-5 text-text-muted"
          size={56}
        />
        <h2 className="font-heading text-display-md text-text-primary">
          The store is getting ready
        </h2>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">
          New free plans and guides are on the way. Check back soon.
        </p>
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
          <StoreProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function StoreProductCard({ product }: { product: StoreProduct }) {
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-panel border border-border-subtle bg-surface-base shadow-soft transition-shadow hover:shadow-raised">
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
          <h3 className="mb-2 font-heading text-display-sm text-text-primary transition-colors group-hover:text-brand-secondary">
            {product.title}
          </h3>
        </Link>
        <p className="mb-6 flex-1 text-body-sm text-text-secondary">
          {product.cardSummary}
        </p>
        <button
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-sm border-2 px-4 py-3 font-medium transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
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
          {isInCart ? "In your cart" : `Get ${product.title} for free`}
        </button>
      </div>
    </article>
  );
}
