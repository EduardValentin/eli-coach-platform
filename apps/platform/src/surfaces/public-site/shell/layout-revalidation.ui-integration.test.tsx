// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BOT_DETECTION_API_URL } from "@eli-coach-platform/infrastructure/bot-detection";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import { WAITLIST_API_URL } from "~/features/waitlist/ui/public/query";
import CatalogRoute, {
  shouldRevalidate as catalogShouldRevalidate,
} from "~/features/store/ui/public/catalog-page";
import { PlatformQueryProvider } from "~/query-client";
import PricingRoute from "~/surfaces/public-site/pages/pricing";

import PublicLayoutRoute, { shouldRevalidate } from "./layout";

const server = setupServer();

// Stands in for what each loader reads. Flipping these between navigations is
// what makes a reload visible: the catalog the store route last loaded is on
// the page, so stale products prove its loader did not run again.
const deploymentConfiguration = { waitlistEnabled: false };
const publishedCatalog = { includesLeanKitchen: true };
const shellLoads: string[] = [];

beforeAll(() => {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  globalThis.ResizeObserver = ResizeObserverStub;
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  deploymentConfiguration.waitlistEnabled = false;
  publishedCatalog.includesLeanKitchen = true;
  shellLoads.length = 0;
  server.use(
    http.get(BOT_DETECTION_API_URL, () =>
      HttpResponse.json({ provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" }),
    ),
    // The waitlist query falls back to the shell's own data when this fails, so
    // the navigation bar keeps stating what the loader last returned.
    http.get(WAITLIST_API_URL, () => new HttpResponse(null, { status: 503 })),
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("public shell revalidation", () => {
  it("keeps the catalog it already loaded when the visitor filters it", async () => {
    // arrange
    const user = userEvent.setup();

    renderPublicSite();
    expect(
      await screen.findByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).toBeInTheDocument();

    // act
    publishedCatalog.includesLeanKitchen = false;
    await user.click(screen.getByRole("button", { name: "Wellness" }));

    // assert
    expect(
      screen.getByRole("heading", { level: 3, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
    await user.click(
      within(
        screen.getByRole("group", { name: "Filter by Goal" }),
      ).getByRole("button", { name: "All" }),
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).toBeInTheDocument();
  });

  it("loads the catalog again when the visitor comes back to the page", async () => {
    // arrange
    const user = userEvent.setup();

    renderPublicSite();
    await screen.findByRole("heading", { level: 3, name: "Lean Kitchen" });

    // act
    publishedCatalog.includesLeanKitchen = false;
    await user.click(screen.getByRole("link", { name: "Pricing" }));
    await user.click(await screen.findByRole("link", { name: "Store" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 3, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).not.toBeInTheDocument();
  });

  it("stays out of a filter change and reloads for a page change", async () => {
    // arrange
    // The shell's data reaches the page only through a query that caches it, so
    // unlike the catalog it cannot be read back from the rendered output — what
    // the shell loaded is recorded as it loads instead.
    const user = userEvent.setup();

    renderPublicSite();
    await screen.findByRole("button", { name: "Wellness" });
    expect(shellLoads).toEqual(["/store"]);

    // act
    await user.click(screen.getByRole("button", { name: "Wellness" }));

    // assert
    expect(shellLoads).toEqual(["/store"]);

    await user.click(screen.getByRole("link", { name: "Pricing" }));
    await screen.findByRole("link", { name: "Store" });

    expect(shellLoads).toEqual(["/store", "/pricing"]);
  });
});

function renderPublicSite() {
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            Component: CatalogRoute,
            loader: () => ({ products: createCatalog() }),
            path: "store",
            shouldRevalidate: catalogShouldRevalidate,
          },
          { Component: PricingRoute, path: "pricing" },
        ],
        Component: PublicLayoutRoute,
        loader: ({ url }) => {
          shellLoads.push(url.pathname);

          return { waitlist: createWaitlistShell() };
        },
        path: "/",
        shouldRevalidate,
      },
    ],
    { initialEntries: ["/store"] },
  );

  return render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

function createWaitlistShell(): Waitlist {
  return {
    availability: null,
    enabled: deploymentConfiguration.waitlistEnabled,
    offer: { campaignSlug: "all-bundles-launch-1", plan: "all-bundles" },
  };
}

function createCatalog() {
  const product = {
    cardSummary: "A practical cycle-aware guide.",
    cover: { alt: "Hormone Harmony cover", url: "/api/store/covers/hh.webp" },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
    includedItems: ["Phase-by-phase guidance"],
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };

  if (!publishedCatalog.includesLeanKitchen) {
    return [product];
  }

  return [
    product,
    {
      ...product,
      cover: { alt: "Lean Kitchen cover", url: "/api/store/covers/lk.webp" },
      goals: [{ displayOrder: 2, label: "Fat Loss", slug: "fat-loss" }],
      slug: "lean-kitchen",
      title: "Lean Kitchen",
      types: [{ displayOrder: 1, label: "Workouts", slug: "workouts" }],
    },
  ];
}
