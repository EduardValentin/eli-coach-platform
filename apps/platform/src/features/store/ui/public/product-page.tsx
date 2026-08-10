import { Button, Card } from "@eli-coach-platform/ui";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  Link,
  type MetaFunction,
  useLoaderData,
} from "react-router";

import { useStoreCart } from "~/features/store/ui/public/cart-provider";
import { loader } from "./product-page.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its loader lives in the sibling `product-page.server.ts`.
// See the rule and why merging them breaks the build: features/README.md:20-26.
export { loader };

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: "Free Resource | Eli Coach Platform" },
      {
        name: "description",
        content: "Free workout, nutrition, and wellbeing resources.",
      },
    ];
  }

  return [
    { title: `${data.title} | Free Resources | Eli Coach Platform` },
    { name: "description", content: data.cardSummary },
  ];
};

export default function ProductDetailsRoute() {
  const product = useLoaderData<typeof loader>();
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <article className="mx-auto w-full max-w-6xl px-6 pb-24 pt-4">
      <Link
        className="-ml-2 mb-12 inline-flex min-h-11 items-center gap-2 px-2 text-body-sm font-medium text-text-secondary transition-colors hover:text-brand-primary"
        to="/store"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Store
      </Link>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface-subtle shadow-raised sm:aspect-square lg:aspect-[4/5]">
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
                className="rounded-xs bg-brand-secondary-soft px-3 py-1.5 text-label uppercase text-brand-secondary"
                key={type.slug}
              >
                {type.label}
              </span>
            ))}
            {product.goals.map((goal) => (
              <span
                className="rounded-xs bg-surface-subtle px-3 py-1.5 text-label uppercase text-text-secondary"
                key={goal.slug}
              >
                {goal.label}
              </span>
            ))}
          </div>
          <h1 className="font-heading text-4xl leading-display-relaxed tracking-tight text-text-primary lg:text-5xl">
            {product.title}
          </h1>
          <div
            aria-hidden="true"
            className="my-8 h-1 w-16 bg-border-subtle"
          />
          <p className="text-body-lg leading-copy-relaxed text-text-secondary">
            {product.detailDescription}
          </p>
          <Card className="my-10 rounded-sm p-6 shadow-soft sm:p-6">
            <h2 className="mb-4 text-body-sm font-semibold uppercase tracking-wide text-text-primary">
              What&apos;s included:
            </h2>
            <ul className="grid gap-4">
              {product.includedItems.map((item) => (
                <li
                  className="flex items-start gap-3 text-text-secondary"
                  key={item}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-brand-secondary"
                    size={20}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Button
            aria-label={
              isInCart
                ? "Added to your cart"
                : `Get ${product.title} for free`
            }
            className="min-h-15 w-full !rounded-control border-0 py-4 leading-7 !text-text-inverted shadow-raised hover:shadow-raised"
            onClick={(event) => {
              addProduct(product.slug);
              openCartFrom(event.currentTarget);
            }}
            size="lg"
            variant="secondary"
          >
            <Download aria-hidden="true" size={21} />
            {isInCart ? "Added to your cart" : "Get it for Free"}
          </Button>
          <p className="mt-5 text-center text-body-sm text-text-secondary">
            We&apos;ll send a private seven-day download link to your email.
          </p>
        </div>
      </div>
    </article>
  );
}
