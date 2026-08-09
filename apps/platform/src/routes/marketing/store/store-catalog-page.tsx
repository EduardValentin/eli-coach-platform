import type { StoreProduct } from "@eli-coach-platform/contracts";
import { cn } from "@eli-coach-platform/ui";
import { Plus, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useReconcileStoreCartCatalog } from "./store-cart";
import { useStoreCart } from "./store-cart-provider";

export function StoreCatalogPage(props: {
  products: readonly StoreProduct[];
}) {
  const reconcileProducts = useStoreCart(
    (cart) => cart.reconcileProducts,
  );
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);

  useReconcileStoreCartCatalog(
    props.products,
    isCartHydrated,
    reconcileProducts,
  );

  return (
    <StoreCatalogShell>
      <CatalogContent products={props.products} />
    </StoreCatalogShell>
  );
}

export function StoreCatalogUnavailable() {
  return (
    <StoreCatalogShell>
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
    </StoreCatalogShell>
  );
}

function StoreCatalogShell(props: { children: ReactNode }) {
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
  if (props.products.length === 0) {
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
