import {
  isRouteErrorResponse,
  type MetaFunction,
  useLoaderData,
  useRouteError,
} from "react-router";

import { StoreCatalogPage, StoreCatalogUnavailable } from "./catalog-view";
import { loader } from "./catalog-page.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its loader lives in the sibling `catalog-page.server.ts`.
// See the rule and why merging them breaks the build: features/README.md:20-26.
export { loader };

export const meta: MetaFunction = () => [
  { title: "Free Resources | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Free workout, nutrition, and wellbeing guides from Eli Coach Platform.",
  },
];

export default function StoreRoute() {
  const { products } = useLoaderData<typeof loader>();

  return <StoreCatalogPage products={products} />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 503) {
    return <StoreCatalogUnavailable />;
  }

  throw error;
}
