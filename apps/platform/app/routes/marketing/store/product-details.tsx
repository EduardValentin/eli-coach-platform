import { storeProductSchema } from "@eli-coach-platform/contracts";
import { Button, Card } from "@eli-coach-platform/ui";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
} from "react-router";

import { getPlatformContainer } from "~/server/container.server";

import { useStoreCart } from "./store-cart";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const response =
    await getPlatformContainer().storeCatalogController.getPublishedProductBySlug(
      params.slug,
    );

  if (!response.ok) {
    throw response;
  }

  return storeProductSchema.parse(await response.json());
}

export default function ProductDetailsRoute() {
  const product = useLoaderData<typeof loader>();
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const isInCart = useStoreCart((cart) =>
    cart.productSlugs.includes(product.slug),
  );
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <article className="mx-auto w-full max-w-6xl pb-24">
      <Link
        className="-ml-2 mb-12 inline-flex min-h-11 items-center gap-2 px-2 text-body-sm font-medium text-text-secondary transition-colors hover:text-brand-primary"
        to="/store"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to store
      </Link>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="aspect-[4/5] overflow-hidden rounded-panel bg-surface-subtle shadow-raised sm:aspect-square lg:aspect-[4/5]">
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
          <h1 className="font-heading text-display-lg tracking-tight text-text-primary">
            {product.title}
          </h1>
          <div
            aria-hidden="true"
            className="my-8 h-1 w-16 bg-border-subtle"
          />
          <p className="text-body-lg leading-copy-relaxed text-text-secondary">
            {product.detailDescription}
          </p>
          <Card className="my-10 p-6">
            <h2 className="mb-4 text-label uppercase tracking-wide text-text-primary">
              What&apos;s included
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
            className="w-full"
            onClick={(event) => {
              addProduct(product.slug);
              openCartFrom(event.currentTarget);
            }}
            size="lg"
            variant="secondary"
          >
            <Download aria-hidden="true" size={21} />
            {isInCart ? "Added to your cart" : "Get it for free"}
          </Button>
          <p className="mt-5 text-center text-body-sm text-text-secondary">
            We&apos;ll send a private seven-day download link to your email.
          </p>
        </div>
      </div>
    </article>
  );
}
