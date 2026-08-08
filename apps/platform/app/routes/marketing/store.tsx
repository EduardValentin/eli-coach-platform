import {
  isRouteErrorResponse,
  type MetaFunction,
  useLoaderData,
  useRouteError,
} from "react-router";

import {
  StoreCatalogPage,
  StoreCatalogUnavailable,
} from "./store/store-catalog-page";
import { loader } from "./store/store.server";

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
