import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it } from "vitest";

import StoreRoute from "./catalog-page";
import { StoreCartProvider } from "./cart-provider";

describe("store catalog server rendering", () => {
  it("includes published products and their detail links in the initial HTML", async () => {
    // arrange
    const handler = createStaticHandler([
      {
        Component: () => (
          <StoreCartProvider>
            <StoreRoute />
          </StoreCartProvider>
        ),
        loader: () => ({ products: [createProduct()] }),
        path: "/store",
      },
    ]);
    const context = await handler.query(
      new Request("https://eli.example/store"),
    );

    if (context instanceof Response) {
      throw new Error(`Expected route context, received ${context.status}.`);
    }

    const router = createStaticRouter(handler.dataRoutes, context);

    // act
    const html = renderToString(
      <StaticRouterProvider context={context} router={router} />,
    );

    // assert
    expect(html).toContain("Hormone Harmony");
    expect(html).toContain('href="/store/hormone-harmony"');
    expect(html).not.toContain("Loading free resources");
  });
});

function createProduct() {
  return {
    cardSummary: "A practical cycle-aware guide.",
    cover: {
      alt: "Hormone Harmony guide cover",
      url: "/api/store/covers/hormone-harmony.webp",
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
    includedItems: ["Phase-by-phase guidance"],
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };
}
