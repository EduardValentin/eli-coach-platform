import {
  isRouteErrorResponse,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
  useLoaderData,
  useRouteError,
} from "react-router";

import { CatalogUnavailableView, CatalogView } from "./catalog-view";
import { haveOnlyFilterParamsChanged } from "./catalog-filters";
import { loader } from "./catalog-page.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its loader lives in the sibling `catalog-page.server.ts`.
// The rule, and why merging them breaks the build: ARCHITECTURE.md,
// under "The `.server` suffix".
export { loader };

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
    content:
      "Free workout, nutrition, and wellbeing guides from Evoa.",
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
