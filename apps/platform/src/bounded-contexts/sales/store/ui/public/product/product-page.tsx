import { cn } from "~/shared/design-system/lib";
import { Button, Card } from "~/shared/design-system/primitives";
import { ArrowLeft, CheckCircle2, Download, ShoppingBag } from "lucide-react";
import {
  Link,
  type MetaFunction,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import { storeProductSchema } from "~/bounded-contexts/sales/store/public/store";
import { formatStorePrice } from "~/bounded-contexts/sales/store/public/store-currency";

import { useStoreCart } from "../cart/cart-provider";
import { Price } from "../pricing/price";

export async function loader({ context, params }: LoaderFunctionArgs) {
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const response = await context
    .get(storeContext)
    .storeCatalogController.getPublishedProductBySlug(params.slug);

  if (!response.ok) {
    throw response;
  }

  return storeProductSchema.parse(await response.json());
}

export const handle = { publicContentFrame: "full-bleed" } as const;

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  if (!loaderData) {
    return [
      { title: "Free Resource | Evoa" },
      {
        name: "description",
        content: "Free workout, nutrition, and wellbeing resources.",
      },
    ];
  }

  const section = loaderData.price ? "Plans" : "Free Resources";

  return [
    { title: `${loaderData.title} | ${section} | Evoa` },
    { name: "description", content: loaderData.cardSummary },
  ];
};

const PAID_PRODUCT = {
  AddIcon: ShoppingBag,
  addLabel: "Add to Cart",
  addVariant: "primary",
  describeAddAction: (title: string) => `Add ${title} to cart`,
} as const;

const FREE_PRODUCT = {
  AddIcon: Download,
  addLabel: "Get it for Free",
  addVariant: "secondary",
  describeAddAction: (title: string) => `Get ${title} for free`,
} as const;

export default function ProductDetailsRoute() {
  const product = useLoaderData<typeof loader>();
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const currency = useStoreCart((cart) => cart.currency);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const isPaid = product.price !== null;
  const kind = isPaid ? PAID_PRODUCT : FREE_PRODUCT;

  return (
    <div
      className="min-h-screen w-full bg-surface-page pb-24"
      data-parity-root="ProductDetails"
    >
      <article className="mx-auto max-w-6xl px-6 pt-32">
        <Link
          className="group mb-12 inline-flex items-center gap-2 text-sm font-medium text-copy-muted transition-colors hover:text-brand-primary"
          to={STORE_PATH}
        >
          <ArrowLeft
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            size={16}
          />
          Back to Store
        </Link>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="aspect-[4/5] overflow-hidden rounded-card bg-surface-subtle shadow-raised sm:aspect-square lg:aspect-[4/5]">
            <img
              alt={product.cover.alt}
              className="size-full object-cover"
              src={product.cover.url}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex flex-wrap gap-2">
              {product.types.map((type) => (
                <span
                  className={cn(
                    "rounded-tile px-3 py-1.5 text-label uppercase",
                    {
                      "bg-brand-primary-soft text-brand-primary": isPaid,
                      "bg-brand-secondary-soft text-brand-secondary": !isPaid,
                    },
                  )}
                  key={type.slug}
                >
                  {type.label}
                </span>
              ))}
              {product.goals.map((goal) => (
                <span
                  className="rounded-tile bg-surface-subtle px-3 py-1.5 text-label uppercase text-copy-muted"
                  key={goal.slug}
                >
                  {goal.label}
                </span>
              ))}
            </div>
            <h1 className="mb-6 font-heading text-4xl leading-tight tracking-tight text-text-primary lg:text-5xl">
              {product.title}
            </h1>
            {product.price && (
              <Price className="mb-8" data-parity="product-price" size="lg">
                {formatStorePrice(product.price, currency)}
              </Price>
            )}
            <div
              aria-hidden="true"
              className="mb-8 h-1 w-16 bg-control-border-soft"
            />
            <p className="mb-10 text-lg leading-relaxed text-copy-muted">
              {product.detailDescription}
            </p>
            <Card className="mb-10">
              <div className="p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">
                  What&apos;s included:
                </h2>
                <ul className="space-y-4">
                  {product.includedItems.map((item) => (
                    <li
                      className="flex items-start gap-3 text-copy-muted"
                      key={item}
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className={cn("mt-0.5 shrink-0", {
                          "text-brand-primary": isPaid,
                          "text-brand-secondary": !isPaid,
                        })}
                        size={20}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            <Button
              aria-label={
                isInCart
                  ? "Added to your cart"
                  : kind.describeAddAction(product.title)
              }
              onClick={(event) => {
                addProduct(product.slug);
                openCartFrom(event.currentTarget);
              }}
              elevation="raised"
              size="lg"
              textSize="lg"
              variant={kind.addVariant}
              width="full"
            >
              <kind.AddIcon aria-hidden="true" size={22} />
              {isInCart ? "Added to your cart" : kind.addLabel}
            </Button>
            <p className="mt-6 text-center text-sm text-copy-muted">
              We&apos;ll send a private seven-day download link to your email.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
