import type { MetaFunction } from "react-router";

import { StoreCatalogPage } from "./store/store-catalog-page";

export const meta: MetaFunction = () => [
  { title: "Free Resources | Eli Coach Platform" },
  {
    name: "description",
    content:
      "Free workout, nutrition, and wellbeing guides from Eli Coach Platform.",
  },
];

export default function StoreRoute() {
  return <StoreCatalogPage />;
}
