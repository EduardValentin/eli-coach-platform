// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { configureAxe } from "vitest-axe";

import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~test-utils/query-client";

import CatalogRoute, {
  ErrorBoundary as CatalogErrorBoundary,
  shouldRevalidate,
} from "./catalog-page";
import { STORE_CART_STORAGE_KEY } from "./cart";
import { StoreCartProvider } from "./cart-provider";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "./cart-drawer";
import { STORE_CATALOG_API_URL } from "./api-client";

const server = setupServer();
const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

beforeAll(() => {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  globalThis.ResizeObserver = ResizeObserverStub;
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("store catalog", () => {
  it("shows live free resources without paid-store controls", async () => {
    // arrange
    const products = [createProduct()];

    // act
    renderStore({ products });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Free resources",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Get Hormone Harmony for free",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /currency/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /filter by/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Plans" }),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an empty live catalog from a loading or error state", async () => {
    // arrange
    const products: readonly ReturnType<typeof createProduct>[] = [];

    // act
    renderStore({ products });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "The store is getting ready",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("prunes saved resources missing from the server-rendered catalog after hydration", async () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony", "removed-guide"],
        version: 1,
      }),
    );

    // act
    renderStore({ products: [createProduct()] });

    // assert
    expect(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!),
    ).toEqual({
      productSlugs: ["hormone-harmony"],
      version: 1,
    });
  });

  it("shows a recoverable catalog error while keeping the public page available", async () => {
    // arrange
    const catalogError = new Response(
      "The store is temporarily unavailable.",
      { status: 503 },
    );

    // act
    renderStore({ catalogError });

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The store is temporarily unavailable",
    );
    expect(
      screen.getByRole("link", { name: "Return home" }),
    ).toHaveAttribute("href", "/");
  });

  it("has no obvious accessibility violations with a live catalog", async () => {
    // arrange
    const products = [createProduct()];

    // act
    const { baseElement } = renderStore({ products });
    await screen.findByRole("heading", {
      level: 2,
      name: "Free resources",
    });
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious accessibility violations in the open acquisition drawer", async () => {
    // arrange
    const user = userEvent.setup();
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony"],
        version: 1,
      }),
    );
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );

    // act
    const { baseElement } = renderStore({ products: [createProduct()] });
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await user.click(
      await within(dialog).findByRole("button", { name: "Continue" }),
    );
    const results = await axe(baseElement);

    // assert
    expect(
      within(dialog).getByRole("heading", { name: "Almost there" }),
    ).toBeInTheDocument();
    expect(results.violations).toEqual([]);
  });

  it("offers one filter row per dimension, in taxonomy order and led by All", async () => {
    // arrange
    const products = createCatalog();

    // act
    renderStore({ products });

    // assert
    const typeFilter = await screen.findByRole("group", { name: "Filter by Type" });
    const goalFilter = screen.getByRole("group", { name: "Filter by Goal" });

    expect(
      within(typeFilter)
        .getAllByRole("button")
        .map((chip) => chip.textContent),
    ).toEqual(["All", "Workouts", "Nutrition Plans", "E-Books"]);
    expect(
      within(goalFilter)
        .getAllByRole("button")
        .map((chip) => chip.textContent),
    ).toEqual(["All", "Muscle Building", "Fat Loss", "Wellness"]);
    expect(
      within(typeFilter).getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("hides a dimension whose published resources share a single value", async () => {
    // arrange
    const products = [
      createProduct(),
      {
        ...createProduct(),
        goals: [GOAL_FAT_LOSS],
        slug: "lean-kitchen",
        title: "Lean Kitchen",
      },
    ];

    // act
    renderStore({ products });

    // assert
    expect(
      await screen.findByRole("group", { name: "Filter by Goal" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Filter by Type" }),
    ).not.toBeInTheDocument();
  });

  it("filters the catalog and records the choice in the URL", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({ products: createCatalog() });

    // act
    await user.click(
      await screen.findByRole("button", { name: "E-Books" }),
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 3, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Glute Growth Guide" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).not.toBeInTheDocument();
    expect(router.state.location.search).toBe("?type=e-books");
    expect(
      screen.getByRole("button", { name: "E-Books" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("requires both dimensions once a Type and a Goal are chosen", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({ products: createCatalog() });

    // act
    await user.click(await screen.findByRole("button", { name: "Workouts" }));
    await user.click(screen.getByRole("button", { name: "Wellness" }));

    // assert
    expect(
      screen.getByRole("heading", { level: 3, name: "Glute Growth Guide" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(router.state.location.search).toBe("?type=workouts&goal=wellness");
  });

  it("removes a dimension from the URL when All is chosen again", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({
      products: createCatalog(),
      url: "/store?type=workouts",
    });
    const typeFilter = await screen.findByRole("group", { name: "Filter by Type" });

    // act
    await user.click(within(typeFilter).getByRole("button", { name: "All" }));

    // assert
    expect(router.state.location.search).toBe("");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("restores the previous selection when the browser goes back", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({ products: createCatalog() });

    await user.click(await screen.findByRole("button", { name: "E-Books" }));
    await user.click(screen.getByRole("button", { name: "Workouts" }));

    // act
    await act(async () => {
      await router.navigate(-1);
    });

    // assert
    expect(router.state.location.search).toBe("?type=e-books");
    expect(
      screen.getByRole("button", { name: "E-Books" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("renders a directly opened filtered URL already filtered", async () => {
    // arrange
    const products = createCatalog();

    // act
    renderStore({ products, url: "/store?goal=fat-loss" });

    // assert
    expect(
      await screen.findByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Fat Loss" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("reuses the loaded catalog when only the filters change", async () => {
    // arrange
    const user = userEvent.setup();
    const { loadCatalog } = renderStore({ products: createCatalog() });

    // act
    await user.click(await screen.findByRole("button", { name: "E-Books" }));
    await user.click(screen.getByRole("button", { name: "Wellness" }));

    // assert
    expect(loadCatalog).toHaveBeenCalledTimes(1);
  });

  it("offers a way out when a valid combination matches nothing", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({
      products: createCatalog(),
      url: "/store?type=nutrition-plans&goal=wellness",
    });

    // act
    expect(
      await screen.findByText("No products found matching your filters."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    expect(router.state.location.search).toBe("");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.queryByText("No products found matching your filters."),
    ).not.toBeInTheDocument();
  });

  it("announces how many resources the filters matched", async () => {
    // arrange
    const user = userEvent.setup();

    renderStore({ products: createCatalog() });

    // act
    await user.click(await screen.findByRole("button", { name: "E-Books" }));

    // assert
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 resources match your filters.",
    );

    await user.click(screen.getByRole("button", { name: "Muscle Building" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 resource matches your filters.",
    );
  });

  it("announces an empty result", async () => {
    // arrange
    const products = createCatalog();

    // act
    renderStore({ products, url: "/store?type=nutrition-plans&goal=wellness" });

    // assert
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No resources match your filters.",
    );
  });

  it("moves across the chips with the arrow keys and activates from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({ products: createCatalog() });
    const typeFilter = await screen.findByRole("group", { name: "Filter by Type" });

    // act
    within(typeFilter).getByRole("button", { name: "All" }).focus();
    await user.keyboard("{ArrowRight}");
    const focusedChip = within(typeFilter).getByRole("button", {
      name: "Workouts",
    });

    // assert
    expect(focusedChip).toHaveFocus();
    expect(router.state.location.search).toBe("");

    await user.keyboard("{Enter}");

    expect(router.state.location.search).toBe("?type=workouts");
    expect(
      within(typeFilter).getByRole("button", { name: "Workouts" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("keeps the first choice when a second lands in the same render", async () => {
    // arrange
    const { router } = renderStore({ products: createCatalog() });

    await screen.findByRole("button", { name: "E-Books" });

    // act
    // `fireEvent` rather than `userEvent`: the point is two choices reaching
    // React in one batch, which awaited interactions never produce.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "E-Books" }));
      fireEvent.click(screen.getByRole("button", { name: "Wellness" }));
    });

    // assert
    expect(router.state.location.search).toBe("?type=e-books&goal=wellness");
  });

  it("takes the same choice again after a navigation was interrupted", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({ products: createCatalog() });

    await screen.findByRole("button", { name: "E-Books" });

    // act
    // The interruption settles on the search the choice started from, so the
    // URL never registers that anything happened.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "E-Books" }));
      await router.navigate("/store");
    });
    expect(router.state.location.search).toBe("");

    await user.click(screen.getByRole("button", { name: "E-Books" }));

    // assert
    expect(router.state.location.search).toBe("?type=e-books");
  });

  it("leaves the filters alone when a chip only takes focus again", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderStore({
      products: createCatalog(),
      url: "/store?type=nutrition-plans&goal=wellness",
    });

    await user.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // act
    screen.getByRole("button", { name: "Nutrition Plans" }).focus();
    await user.tab();
    await user.tab({ shift: true });

    // assert
    expect(router.state.location.search).toBe("");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Nutrition Plans" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("has no obvious accessibility violations while nothing matches", async () => {
    // arrange
    const products = createCatalog();

    // act
    const { baseElement } = renderStore({
      products,
      url: "/store?type=nutrition-plans&goal=wellness",
    });
    await screen.findByRole("button", { name: "Clear filters" });
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious accessibility violations with the filters on show", async () => {
    // arrange
    const user = userEvent.setup();
    const { baseElement } = renderStore({ products: createCatalog() });

    // act
    await user.click(await screen.findByRole("button", { name: "E-Books" }));
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("keeps a taxonomy value slugged \"all\" apart from the All chip", async () => {
    // arrange
    const products = [
      { ...createProduct(), types: [TYPE_ALL_LEVELS] },
      {
        ...createProduct(),
        slug: "lean-kitchen",
        title: "Lean Kitchen",
        types: [TYPE_WORKOUTS],
      },
    ];

    // act
    const { router } = renderStore({ products });
    const typeFilter = await screen.findByRole("group", { name: "Filter by Type" });

    // assert
    expect(
      within(typeFilter).getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(typeFilter).getByRole("button", { name: "All Levels" }),
    ).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(
      within(typeFilter).getByRole("button", { name: "All Levels" }),
    );

    expect(router.state.location.search).toBe("?type=all");
    expect(
      within(typeFilter).getByRole("button", { name: "All Levels" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("keeps a filtered-out resource in the cart", async () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({ productSlugs: ["lean-kitchen"], version: 1 }),
    );

    // act
    renderStore({ products: createCatalog(), url: "/store?type=workouts" });

    // assert
    expect(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Lean Kitchen" }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!),
    ).toEqual({ productSlugs: ["lean-kitchen"], version: 1 });
  });

  it("drops the Free resources section while nothing matches", async () => {
    // arrange
    const products = createCatalog();

    // act
    renderStore({ products, url: "/store?type=nutrition-plans&goal=wellness" });

    // assert
    expect(
      await screen.findByText("No products found matching your filters."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Free resources" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toEqual([]);
  });

  it("holds on to focus when clearing the filters removes the button", async () => {
    // arrange
    const user = userEvent.setup();

    renderStore({
      products: createCatalog(),
      url: "/store?type=nutrition-plans&goal=wellness",
    });

    // act
    await user.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Nutrition Plans" }),
    ).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });
});

function renderStore(options: {
  catalogError?: Response;
  products?: readonly ReturnType<typeof createProduct>[];
  url?: string;
}) {
  const queryClient = createTestQueryClient();
  const QueryWrapper = createTestQueryClientWrapper(queryClient);
  const loadCatalog = vi.fn(() => {
    if (options.catalogError) {
      throw options.catalogError;
    }

    return { products: options.products ?? [] };
  });
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <StoreCartProvider>
            <StoreCartButton />
            {/* The public layout renders every route inside this landmark, so
                the harness does too and axe judges the real page structure. */}
            <main aria-label="Public site content">
              <CatalogRoute />
            </main>
            <StoreCartDrawer
              botDetection={{
                config: {
                  provider: "static",
                  token: "static-store-token",
                },
                status: "ready",
              }}
            />
          </StoreCartProvider>
        ),
        ErrorBoundary: CatalogErrorBoundary,
        loader: loadCatalog,
        path: "/store",
        shouldRevalidate,
      },
      {
        loader: () => fetch(STORE_CATALOG_API_URL),
        path: STORE_CATALOG_API_URL,
      },
    ],
    { initialEntries: [options.url ?? "/store"] },
  );

  return {
    ...render(
      <QueryWrapper>
        <RouterProvider router={router} />
      </QueryWrapper>,
    ),
    loadCatalog,
    router,
  };
}

const TYPE_WORKOUTS = { displayOrder: 1, label: "Workouts", slug: "workouts" };
const TYPE_NUTRITION_PLANS = {
  displayOrder: 2,
  label: "Nutrition Plans",
  slug: "nutrition-plans",
};
const TYPE_E_BOOKS = { displayOrder: 3, label: "E-Books", slug: "e-books" };
const TYPE_ALL_LEVELS = {
  displayOrder: 4,
  label: "All Levels",
  slug: "all",
};
const GOAL_MUSCLE_BUILDING = {
  displayOrder: 1,
  label: "Muscle Building",
  slug: "muscle-building",
};
const GOAL_FAT_LOSS = { displayOrder: 2, label: "Fat Loss", slug: "fat-loss" };
const GOAL_WELLNESS = { displayOrder: 3, label: "Wellness", slug: "wellness" };

function createCatalog() {
  return [
    createProduct(),
    {
      ...createProduct(),
      goals: [GOAL_FAT_LOSS],
      slug: "lean-kitchen",
      title: "Lean Kitchen",
      types: [TYPE_NUTRITION_PLANS],
    },
    {
      ...createProduct(),
      goals: [GOAL_MUSCLE_BUILDING, GOAL_WELLNESS],
      slug: "glute-growth-guide",
      title: "Glute Growth Guide",
      types: [TYPE_WORKOUTS, TYPE_E_BOOKS],
    },
  ];
}

function createProduct() {
  return {
    cardSummary: "A practical cycle-aware guide.",
    cover: {
      alt: "Hormone Harmony guide cover",
      url: "/api/store/covers/hormone-harmony.webp",
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [GOAL_WELLNESS],
    includedItems: ["Phase-by-phase guidance"],
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [TYPE_E_BOOKS],
  };
}
