export type ProductLifecycleStatus = "draft" | "published" | "archived";

export const CATALOG_PRODUCT_LIFECYCLES = [
  "published",
] as const satisfies readonly ProductLifecycleStatus[];

export const OWNED_PRODUCT_LIFECYCLES = [
  "published",
  "archived",
] as const satisfies readonly ProductLifecycleStatus[];
