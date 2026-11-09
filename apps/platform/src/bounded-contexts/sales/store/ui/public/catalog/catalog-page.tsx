import { useSearchParamsWriter } from "~/shared/design-system/lib";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
  useLoaderData,
  useRouteError,
  redirect,
  type LoaderFunctionArgs,
} from "react-router";

import { storeContext } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  STORE_PAYMENT_CANCELLED,
  STORE_PAYMENT_PARAM,
} from "~/bounded-contexts/sales/store/public/paths";
import {
  storeCatalogResponseSchema,
  type StoreProduct,
} from "~/bounded-contexts/sales/store/public/store";

import { useStoreCart } from "../cart/cart-provider";
import { CatalogUnavailableView, CatalogView } from "./catalog-view";
import {
  haveOnlyFilterParamsChanged,
  resolveCanonicalFilterTarget,
} from "./catalog-filters";

export type StoreCatalogLoaderData = {
  products: readonly StoreProduct[];
};

export async function loader(
  args: LoaderFunctionArgs,
): Promise<StoreCatalogLoaderData> {
  const response = await args.context
    .get(storeContext)
    .storeCatalogController.getPublishedCatalog();

  if (!response.ok) {
    throw response;
  }

  const catalog = storeCatalogResponseSchema.parse(await response.json());

  if (!catalog.success) {
    throw new Response(catalog.error.message, { status: 503 });
  }

  const target = resolveCanonicalFilterTarget(catalog.products, args.url);

  if (target) {
    throw redirect(target);
  }

  return { products: catalog.products };
}

// Filtering runs in the browser over the catalog this route already loaded,
// so a filter change needs the URL and nothing from the server.
export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyFilterParamsChanged(currentUrl, nextUrl)
    ? false
    : defaultShouldRevalidate;
}

export const handle = { publicContentFrame: "full-bleed" } as const;

export const meta: MetaFunction = () => [
  { title: "Store | Evoa" },
  {
    name: "description",
    content:
      "Workout and nutrition plans, plus free guides to get you started.",
  },
];

export default function CatalogRoute() {
  const { products } = useLoaderData<typeof loader>();
  useCancelledPaymentReturn();

  return <CatalogView products={products} />;
}

function useCancelledPaymentReturn() {
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const isCartHydrated = useStoreCart((cart) => cart.isHydrated);
  const openCartAfterCancelledPayment = useStoreCart(
    (cart) => cart.openCartAfterCancelledPayment,
  );
  const returnedFromCancelledPayment =
    searchParams.get(STORE_PAYMENT_PARAM) === STORE_PAYMENT_CANCELLED;

  useEffect(() => {
    if (!returnedFromCancelledPayment || !isCartHydrated) {
      return;
    }

    openCartAfterCancelledPayment();
    replaceSearchParams((params) => params.delete(STORE_PAYMENT_PARAM));
  }, [
    isCartHydrated,
    openCartAfterCancelledPayment,
    replaceSearchParams,
    returnedFromCancelledPayment,
  ]);
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 503) {
    return <CatalogUnavailableView />;
  }

  throw error;
}
