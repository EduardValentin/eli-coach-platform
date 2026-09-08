import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it } from "vitest";

import { createOwnedProduct } from "~/features/store/ui/public/library-products.test-support";
import type { LibraryContent } from "~/features/store/ui/public/library-view";

import LibraryRoute from "./library";

describe("library server rendering", () => {
  it("includes the owned products in the initial HTML, with no loading state", async () => {
    // arrange
    const products = [
      createOwnedProduct(),
      createOwnedProduct({ slug: "lean-kitchen", title: "Lean Kitchen" }),
    ];

    // act
    const html = await renderLibrary({ products, status: "loaded" });

    // assert
    expect(html).toContain("Your Library");
    expect(html).toContain("Hormone Harmony");
    expect(html).toContain("Lean Kitchen");
    expect(html).not.toContain("Loading your Library");
  });

  it("server-renders the failure state rather than an error page", async () => {
    // arrange
    const unavailableLibrary = { status: "unavailable" } as const;

    // act
    const html = await renderLibrary(unavailableLibrary);

    // assert
    expect(html).toContain("We couldn&#x27;t load your Library");
    expect(html).toContain("Try again");
  });
});

async function renderLibrary(loaderData: LibraryContent) {
  const handler = createStaticHandler([
    {
      Component: LibraryRoute,
      loader: () => loaderData,
      path: "/library",
    },
  ]);
  const context = await handler.query(
    new Request("https://eli.example/library"),
  );

  if (context instanceof Response) {
    throw new Error(`Expected route context, received ${context.status}.`);
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  return renderToString(
    <StaticRouterProvider context={context} router={router} />,
  );
}

