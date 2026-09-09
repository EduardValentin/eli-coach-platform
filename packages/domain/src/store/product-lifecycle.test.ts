import { describe, expect, it } from "vitest";

import {
  CATALOG_PRODUCT_LIFECYCLES,
  OWNED_PRODUCT_LIFECYCLES,
  type ProductLifecycleStatus,
} from "./product-lifecycle";

describe("store product lifecycles", () => {
  it("keeps every lifecycle the catalog lists in its owner's Library", () => {
    // arrange
    const ownedLifecycles = new Set<ProductLifecycleStatus>(
      OWNED_PRODUCT_LIFECYCLES,
    );

    // act
    const lifecyclesAnOwnerWouldLose = CATALOG_PRODUCT_LIFECYCLES.filter(
      (lifecycle) => !ownedLifecycles.has(lifecycle),
    );

    // assert
    expect(lifecyclesAnOwnerWouldLose).toEqual([]);
  });

  it("shows a draft product on no surface", () => {
    // arrange
    const lifecyclesAnySurfaceShows = new Set<ProductLifecycleStatus>([
      ...CATALOG_PRODUCT_LIFECYCLES,
      ...OWNED_PRODUCT_LIFECYCLES,
    ]);

    // act
    const anySurfaceShowsDraft = lifecyclesAnySurfaceShows.has("draft");

    // assert
    expect(anySurfaceShowsDraft).toBe(false);
  });
});
