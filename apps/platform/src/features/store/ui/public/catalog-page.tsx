import {
  isRouteErrorResponse,
  type MetaFunction,
  useLoaderData,
  useRouteError,
} from "react-router";

import { CatalogUnavailableView, CatalogView } from "./catalog-view";
import { loader } from "./catalog-page.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its loader lives in the sibling `catalog-page.server.ts`.
// The rule, and why merging them breaks the build: ARCHITECTURE.md,
// under "The `.server` suffix".
export { loader };

export const meta: MetaFunction = () => [
  { title: "Free Resources | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Free workout, nutrition, and wellbeing guides from Eli Coach Platform.",
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
