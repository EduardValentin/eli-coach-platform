import { cn, useSearchParamsWriter } from "~/shared/design-system/lib";
import { useClientReducedMotionPreference } from "~/shared/design-system/motion";
import {
  buttonVariants,
  Card,
  cardVariants,
  ChoiceGroup,
  ChoiceOption,
} from "~/shared/design-system/primitives";
import {
  DollarSign,
  Euro,
  type LucideIcon,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { storeProductPath } from "~/bounded-contexts/sales/store/public/paths";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";
import {
  formatStorePrice,
  isStoreCurrency,
  STORE_CURRENCIES,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/public/store-currency";

import { useReconcileStoreCartCatalog } from "../cart/cart";
import { useStoreCart } from "../cart/cart-provider";
import { ProductTag } from "../presentation/product-tag";
import { FreeTag } from "../pricing/free-tag";
import {
  StoreCatalogFilters,
  useStoreCatalogFilterFocus,
} from "./catalog-filter-controls";
import { removeFilterParams, type StoreFilterParam } from "./catalog-filters";
import { presentCatalog } from "./catalog-presenter";

export function CatalogView(props: { products: readonly StoreProduct[] }) {
  const reconcileProducts = useStoreCart((cart) => cart.reconcileProducts);
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);

  // The cart is reconciled against the whole published catalog: a filtered-out
  // resource is still on sale, and must not be dropped from a saved cart.
  useReconcileStoreCartCatalog(
    props.products,
    isCartHydrated,
    reconcileProducts,
  );

  return (
    <CatalogShell
      headerAction={
        props.products.length > 0 ? <StoreCurrencySwitch /> : undefined
      }
    >
      <CatalogContent products={props.products} />
    </CatalogShell>
  );
}

export function CatalogUnavailableView() {
  return (
    <CatalogShell>
      <Card className="p-10 text-center" role="alert" variant="panel">
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
      </Card>
    </CatalogShell>
  );
}

function CatalogShell(props: {
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full bg-surface-page pb-24"
      data-parity-root="Store"
    >
      <div className="mx-auto max-w-7xl px-6 pt-32">
        <header className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="mb-4 font-heading text-4xl tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              Find the right plan
            </h1>
            <p className="text-lg text-copy-muted">
              Workout and nutrition plans, plus free guides to get you started.
            </p>
          </div>
          {props.headerAction}
        </header>
        {props.children}
      </div>
    </div>
  );
}

const CURRENCY_ICONS: Readonly<Record<StoreCurrency, LucideIcon>> = {
  EUR: Euro,
  USD: DollarSign,
};

function StoreCurrencySwitch() {
  const currency = useStoreCart((cart) => cart.currency);
  const setCurrency = useStoreCart((cart) => cart.setCurrency);

  return (
    <ChoiceGroup
      aria-label="Currency"
      look="pill"
      onValueChange={(value) => {
        if (isStoreCurrency(value)) {
          setCurrency(value);
        }
      }}
      value={currency}
    >
      {STORE_CURRENCIES.map((option) => {
        const CurrencyIcon = CURRENCY_ICONS[option];

        return (
          <ChoiceOption key={option} value={option}>
            <CurrencyIcon aria-hidden="true" size={16} /> {option}
          </ChoiceOption>
        );
      })}
    </ChoiceGroup>
  );
}

function CatalogContent(props: { products: readonly StoreProduct[] }) {
  const { searchParams, writeSearchParams } = useSearchParamsWriter();
  const { chipsRef, focusSelection } = useStoreCatalogFilterFocus();

  if (props.products.length === 0) {
    return <EmptyCatalogView />;
  }

  const {
    dimensions,
    freeResources,
    matchCountText,
    offersFilters,
    plans,
    selection,
  } = presentCatalog(props.products, searchParams);

  function selectFilter(param: StoreFilterParam, slug: string | null) {
    writeSearchParams((params) => {
      if (slug) {
        params.set(param, slug);
      } else {
        params.delete(param);
      }
    });
  }

  function clearFilters() {
    // The button doing this disappears with the empty state it sits in, which
    // would drop focus to the document body. The chips outlive the change.
    focusSelection();
    writeSearchParams(removeFilterParams);
  }

  return (
    <>
      {offersFilters && (
        <>
          <StoreCatalogFilters
            chipsRef={chipsRef}
            dimensions={dimensions}
            onSelect={selectFilter}
            selection={selection}
          />
          <p className="ui-sr-only" role="status">
            {matchCountText}
          </p>
        </>
      )}
      <CatalogResults
        freeResources={freeResources}
        onClearFilters={clearFilters}
        plans={plans}
      />
    </>
  );
}

function CatalogResults(props: {
  freeResources: readonly StoreProduct[];
  onClearFilters: () => void;
  plans: readonly StoreProduct[];
}) {
  if (props.plans.length === 0 && props.freeResources.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl font-medium text-copy-muted">
          No products found matching your filters.
        </p>
        <button
          className="mt-6 font-medium text-brand-primary hover:underline"
          onClick={props.onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <>
      {props.plans.length > 0 && (
        <CatalogSection
          className="mb-20"
          headingId="plans-heading"
          products={props.plans}
          title="Plans"
        />
      )}
      {props.freeResources.length > 0 && (
        <CatalogSection
          headingId="free-resources-heading"
          products={props.freeResources}
          title="Free resources"
        />
      )}
    </>
  );
}

function CatalogSection(props: {
  className?: string;
  headingId: string;
  products: readonly StoreProduct[];
  title: string;
}) {
  return (
    <section aria-labelledby={props.headingId} className={props.className}>
      <h2
        className="mb-8 border-b border-control-border-soft px-3 pb-4 font-heading text-3xl text-text-primary"
        id={props.headingId}
      >
        {props.title}
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {props.products.map((product) => (
          <CatalogProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function EmptyCatalogView() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <ShoppingBag aria-hidden="true" className="text-icon-muted" size={64} />
      <h2 className="font-heading text-3xl text-text-primary">
        The store is getting ready
      </h2>
      <p className="max-w-md text-copy-muted">
        New plans and guides are on the way. Check back soon.
      </p>
    </div>
  );
}

const PAID_CARD_PRESENTATION = {
  AddIcon: ShoppingBag,
  addLabel: "Add to Cart",
  addVariant: "inverted",
  describeAddAction: (title: string) => `Add ${title} to cart`,
  tagTone: "paid",
  titleHoverClass: "group-hover:text-brand-primary",
} as const;

const FREE_CARD_PRESENTATION = {
  AddIcon: Plus,
  addLabel: "Get for free",
  addVariant: "outline",
  describeAddAction: (title: string) => `Get ${title} for free`,
  tagTone: "free",
  titleHoverClass: "group-hover:text-brand-secondary",
} as const;

function CatalogProductCard({ product }: { product: StoreProduct }) {
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const currency = useStoreCart((cart) => cart.currency);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const presentation = product.price
    ? PAID_CARD_PRESENTATION
    : FREE_CARD_PRESENTATION;
  const prefersReducedMotion = useClientReducedMotionPreference();

  return (
    <motion.article
      animate={prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      className={cn(
        cardVariants(),
        "group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-raised motion-reduce:transform-none",
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      viewport={{ once: true }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
    >
      <Link
        className="relative block aspect-[4/3] overflow-hidden"
        to={storeProductPath(product.slug)}
      >
        <img
          alt={product.cover.alt}
          className="size-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
          src={product.cover.url}
        />
        {product.price ? (
          <CoverPriceTag className="absolute right-4 top-4">
            {formatStorePrice(product.price, currency)}
          </CoverPriceTag>
        ) : (
          <FreeTag className="absolute right-4 top-4" />
        )}
      </Link>
      <div className="flex grow flex-col p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {product.types.map((type) => (
            <ProductTag key={type.slug} size="sm" tone={presentation.tagTone}>
              {type.label}
            </ProductTag>
          ))}
        </div>
        <Link to={storeProductPath(product.slug)}>
          <h3
            className={cn(
              "mb-2 line-clamp-2 font-heading text-xl font-medium text-text-primary transition-colors",
              presentation.titleHoverClass,
            )}
          >
            {product.title}
          </h3>
        </Link>
        <p className="mb-6 line-clamp-2 grow text-sm text-copy-muted">
          {product.cardSummary}
        </p>
        <button
          aria-label={
            isInCart
              ? `${product.title} is in your cart`
              : presentation.describeAddAction(product.title)
          }
          className={buttonVariants({
            size: "lg",
            variant: isInCart ? "secondary" : presentation.addVariant,
            width: "full",
          })}
          onClick={(event) => {
            addProduct(product.slug);
            openCartFrom(event.currentTarget);
          }}
          type="button"
        >
          <presentation.AddIcon aria-hidden="true" size={18} />
          {isInCart ? "In your cart" : presentation.addLabel}
        </button>
      </div>
    </motion.article>
  );
}

function CoverPriceTag(props: { children: ReactNode; className: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-surface-base/90 px-3 py-1.5 text-sm font-bold text-text-primary backdrop-blur-sm",
        props.className,
      )}
      data-parity="product-price"
    >
      {props.children}
    </span>
  );
}
