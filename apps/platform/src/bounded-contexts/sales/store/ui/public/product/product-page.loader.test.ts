import { describe, expect, it, vi } from "vitest";

import {
  storeContext,
  type StoreFeature,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader } from "./product-page";

describe("product details loader", () => {
  it("throws the controller's genuine 404 for an unknown or unpublished slug", async () => {
    // arrange
    const getPublishedProductBySlug = vi
      .fn()
      .mockResolvedValue(new Response("Not Found", { status: 404 }));
    const args = createRequestArgs({
      contexts: [
        contextEntry(storeContext, {
          catalog: { getPublishedProductBySlug },
        } as unknown as StoreFeature),
      ],
      params: { slug: "unpublished-guide" },
    });

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });
});
