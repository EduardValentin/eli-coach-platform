import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it } from "vitest";

import CatalogRoute from "./catalog-page";
import { StoreCartProvider } from "./cart-provider";

describe("store catalog server rendering", () => {
  it("includes published products and their detail links in the initial HTML", async () => {
    // arrange
    const handler = createStaticHandler([
      {
        Component: () => (
          <StoreCartProvider>
            <CatalogRoute />
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

  it("serves a directly opened filtered URL already filtered", async () => {
    // arrange
    const handler = createStaticHandler([
      {
        Component: () => (
          <StoreCartProvider>
            <CatalogRoute />
          </StoreCartProvider>
        ),
        loader: () => ({
          products: [
            createProduct(),
            {
              ...createProduct(),
              cover: {
                alt: "Lean Kitchen guide cover",
                url: "/api/store/covers/lean-kitchen.webp",
              },
              goals: [{ displayOrder: 2, label: "Fat Loss", slug: "fat-loss" }],
              slug: "lean-kitchen",
              title: "Lean Kitchen",
              types: [
                { displayOrder: 1, label: "Workouts", slug: "workouts" },
              ],
            },
          ],
        }),
        path: "/store",
      },
    ]);
    const context = await handler.query(
      new Request("https://eli.example/store?goal=fat-loss"),
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
    expect(html).toContain('href="/store/lean-kitchen"');
    expect(html).not.toContain('href="/store/hormone-harmony"');
    expect(html).toContain("Filter by Goal");
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
