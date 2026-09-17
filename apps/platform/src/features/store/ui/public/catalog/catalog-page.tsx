import {
  isRouteErrorResponse,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
  useLoaderData,
  useRouteError,
  redirect,
  type LoaderFunctionArgs,
} from "react-router";

import { storeContext } from "~/features/store/server/guards/store-context.server";
import {
  storeCatalogResponseSchema,
  type StoreProduct,
} from "~/features/store/contracts/store";

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
    .catalog.getPublishedCatalog();

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

export const meta: MetaFunction = () => [
  { title: "Free Resources | Evoa" },
  {
    name: "description",
    content: "Free workout, nutrition, and wellbeing guides from Evoa.",
  },
];

export default function CatalogRoute() {
  const { products } = useLoaderData<typeof loader>();

  return <CatalogView products={products} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 503) {
    return <CatalogUnavailableView />;
  }

  throw error;
}
