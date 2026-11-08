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
import { ProductTag } from "../presentation/product-tag";
import { STORE_CAPTION_CLASS } from "../presentation/store-caption";
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

const PAID_PRODUCT_PRESENTATION = {
  AddIcon: ShoppingBag,
  addLabel: "Add to Cart",
  addVariant: "primary",
  checkIconClass: "text-brand-primary",
  describeAddAction: (title: string) => `Add ${title} to cart`,
  tagTone: "paid",
} as const;

const FREE_PRODUCT_PRESENTATION = {
  AddIcon: Download,
  addLabel: "Get it for Free",
  addVariant: "secondary",
  checkIconClass: "text-brand-secondary",
  describeAddAction: (title: string) => `Get ${title} for free`,
  tagTone: "free",
} as const;

export default function ProductDetailsRoute() {
  const product = useLoaderData<typeof loader>();
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const currency = useStoreCart((cart) => cart.currency);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const presentation = product.price
    ? PAID_PRODUCT_PRESENTATION
    : FREE_PRODUCT_PRESENTATION;

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
                <ProductTag
                  key={type.slug}
                  size="md"
                  tone={presentation.tagTone}
                >
                  {type.label}
                </ProductTag>
              ))}
              {product.goals.map((goal) => (
                <ProductTag key={goal.slug} size="md" tone="goal">
                  {goal.label}
                </ProductTag>
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
                <h2
                  className={cn(
                    STORE_CAPTION_CLASS,
                    "mb-4 text-sm text-text-primary",
                  )}
                >
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
                        className={cn(
                          "mt-0.5 shrink-0",
                          presentation.checkIconClass,
                        )}
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
                  : presentation.describeAddAction(product.title)
              }
              onClick={(event) => {
                addProduct(product.slug);
                openCartFrom(event.currentTarget);
              }}
              elevation="raised"
              size="lg"
              textSize="lg"
              variant={presentation.addVariant}
              width="full"
            >
              <presentation.AddIcon aria-hidden="true" size={22} />
              {isInCart ? "Added to your cart" : presentation.addLabel}
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
