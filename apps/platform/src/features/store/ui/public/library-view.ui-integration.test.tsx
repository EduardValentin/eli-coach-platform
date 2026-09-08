// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { configureAxe } from "vitest-axe";

import type { StoreProduct } from "~/features/store/contracts/store";

import { createOwnedProduct } from "./library-products.test-support";
import { LibraryView, type LibraryContent } from "./library-view";

const server = setupServer();
const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

const savedFilenames: string[] = [];
const pendingDownloads = new Map<string, () => void>();

beforeAll(() => {
  // jsdom implements neither half of the object-URL pair the browser hands a
  // blob download, so the test provides them and records what was saved.
  URL.createObjectURL = () => "blob:library-download";
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function captureSave(this: HTMLAnchorElement) {
      savedFilenames.push(this.download);
    },
  );
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  savedFilenames.length = 0;
  pendingDownloads.clear();
  server.resetHandlers();
});

afterAll(() => {
  vi.restoreAllMocks();
  server.close();
});

describe("library list", () => {
  it("lists every owned product in the order the loader served them", () => {
    // arrange
    renderLibrary({ content: loaded([hormoneHarmony(), leanKitchen()]) });

    // act
    const rows = screen.getAllByRole("listitem");

    // assert
    expect(
      rows.map((row) => within(row).getByRole("heading", { level: 2 }).textContent),
    ).toEqual(["Hormone Harmony", "Lean Kitchen"]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your Library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Every product you own, ready to download again whenever you need it.",
      ),
    ).toBeInTheDocument();
  });

  it("marks each product free and lists its type labels before its goal labels", () => {
    // arrange
    renderLibrary({ content: loaded([hormoneHarmony()]) });

    // act
    const row = screen.getByRole("listitem");

    // assert
    expect(within(row).getByText("Free")).toBeInTheDocument();
    expect(within(row).getByText("E-Books · Wellness")).toBeInTheDocument();
  });

  it("shows the cover as decoration beside the title it belongs to", () => {
    // arrange
    renderLibrary({ content: loaded([hormoneHarmony()]) });

    // act
    const cover = screen.getByRole("listitem").querySelector("img");

    // assert
    expect(cover).toHaveAttribute("src", "/api/store/covers/hormone-harmony.webp");
    expect(cover).toHaveAttribute("alt", "");
  });

  it("sends an empty Library to the Store instead of showing an error", () => {
    // arrange
    renderLibrary({ content: loaded([]) });

    // act
    const heading = screen.getByRole("heading", { level: 1 });

    // assert
    expect(heading).toHaveTextContent("Nothing in your Library yet");
    expect(
      screen.getByText(
        "Products you purchase or request appear here, ready to download whenever you need them.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the Store" })).toHaveAttribute(
      "href",
      "/store",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("states a failed load as its own page and offers the retry", async () => {
    // arrange
    const user = userEvent.setup();
    const retry = vi.fn();
    renderLibrary({ content: { status: "unavailable" }, onRetry: retry });

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your products are safe — this one is on our end. Please try again in a moment.",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "We couldn't load your Library" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Your Library" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the header and announces the wait while a retry is in flight", () => {
    // arrange
    renderLibrary({ content: { status: "unavailable" }, isReloading: true });

    // act
    const status = screen.getByRole("status");

    // assert
    expect(status).toHaveTextContent("Loading your Library");
    expect(
      screen.getByRole("heading", { level: 1, name: "Your Library" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no obvious accessibility violations listing owned products", async () => {
    // arrange
    const { baseElement } = renderLibrary({
      content: loaded([hormoneHarmony(), leanKitchen()]),
    });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious accessibility violations while a retry loads", async () => {
    // arrange
    const { baseElement } = renderLibrary({
      content: { status: "unavailable" },
      isReloading: true,
    });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("library downloads", () => {
  it("saves the file the server names for the product asked for", async () => {
    // arrange
    const user = userEvent.setup();
    stubDownloads();
    renderLibrary({ content: loaded([hormoneHarmony(), leanKitchen()]) });

    // act
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );

    // assert
    await waitFor(() => {
      expect(savedFilenames).toEqual(["hormone-harmony.pdf"]);
    });
  });

  it("says it is preparing the download it is preparing, and no other", async () => {
    // arrange
    const user = userEvent.setup();
    stubHeldDownloads();
    renderLibrary({ content: loaded([hormoneHarmony(), leanKitchen()]) });

    // act
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );

    // assert
    const preparing = await screen.findByRole("button", {
      name: "Download Hormone Harmony",
    });
    expect(preparing).toHaveTextContent("Preparing…");
    expect(preparing).toHaveAttribute("aria-busy", "true");
    expect(preparing).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Download Lean Kitchen" }),
    ).toHaveTextContent("Download");
  });

  it("prepares two products at once and settles each on its own", async () => {
    // arrange
    const user = userEvent.setup();
    stubHeldDownloads();
    renderLibrary({ content: loaded([hormoneHarmony(), leanKitchen()]) });

    // act
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );
    await user.click(screen.getByRole("button", { name: "Download Lean Kitchen" }));
    await waitFor(() => {
      expect(pendingDownloads.size).toBe(2);
    });
    pendingDownloads.get("hormone-harmony")?.();

    // assert
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Download Hormone Harmony" }),
      ).toHaveTextContent("Download");
    });
    expect(
      screen.getByRole("button", { name: "Download Lean Kitchen" }),
    ).toHaveTextContent("Preparing…");
  });

  it("reports a refused download under the row it belongs to", async () => {
    // arrange
    const user = userEvent.setup();
    stubDownloads({ refusedSlugs: ["hormone-harmony"] });
    renderLibrary({ content: loaded([hormoneHarmony(), leanKitchen()]) });

    // act
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );

    // assert
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent(
      "We couldn't prepare your download right now. Please try again.",
    );
    const [failedRow, healthyRow] = screen.getAllByRole("listitem");
    expect(failedRow).toContainElement(failure);
    expect(within(healthyRow).queryByRole("alert")).not.toBeInTheDocument();
    expect(savedFilenames).toEqual([]);
  });

  it("clears an earlier failure when the same row is asked again", async () => {
    // arrange
    const user = userEvent.setup();
    stubDownloads({ refusedSlugs: ["hormone-harmony"] });
    renderLibrary({ content: loaded([hormoneHarmony()]) });
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );
    await screen.findByRole("alert");
    stubDownloads();

    // act
    await user.click(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    );

    // assert
    await waitFor(() => {
      expect(savedFilenames).toEqual(["hormone-harmony.pdf"]);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

function renderLibrary(options: {
  content: LibraryContent;
  isReloading?: boolean;
  onRetry?: () => void;
}) {
  return render(
    <MemoryRouter>
      {/* The public layout renders every route inside this landmark, so the
          harness does too and axe judges the real page structure. */}
      <main aria-label="Public site content">
        <LibraryView
          content={options.content}
          isReloading={options.isReloading ?? false}
          onRetry={options.onRetry ?? (() => {})}
        />
      </main>
    </MemoryRouter>,
  );
}

function stubDownloads(options?: { refusedSlugs?: readonly string[] }) {
  server.use(
    http.get("/api/store/library/:slug/download", ({ params }) => {
      const slug = String(params.slug);

      return options?.refusedSlugs?.includes(slug)
        ? HttpResponse.json(
            { error: "temporarily_unavailable" },
            { status: 503 },
          )
        : downloadResponseFor(slug);
    }),
  );
}

// Every download waits in `pendingDownloads` until the case releases it, which
// is how a row can be observed while it is still preparing.
function stubHeldDownloads() {
  server.use(
    http.get("/api/store/library/:slug/download", async ({ params }) => {
      const slug = String(params.slug);

      await new Promise<void>((release) => {
        pendingDownloads.set(slug, release);
      });

      return downloadResponseFor(slug);
    }),
  );
}

function downloadResponseFor(slug: string) {
  return HttpResponse.text("bytes", {
    headers: { "Content-Disposition": `attachment; filename="${slug}.pdf"` },
  });
}

function loaded(products: readonly StoreProduct[]): LibraryContent {
  return { products, status: "loaded" };
}

function hormoneHarmony() {
  return createOwnedProduct();
}

function leanKitchen() {
  return createOwnedProduct({
    cover: {
      alt: "Lean Kitchen guide cover",
      url: "/api/store/covers/lean-kitchen.webp",
    },
    goals: [{ displayOrder: 2, label: "Fat Loss", slug: "fat-loss" }],
    slug: "lean-kitchen",
    title: "Lean Kitchen",
    types: [
      { displayOrder: 2, label: "Nutrition Plans", slug: "nutrition-plans" },
    ],
  });
}


