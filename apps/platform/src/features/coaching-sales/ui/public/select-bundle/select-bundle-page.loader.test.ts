import { data } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { headers, loader, shouldRevalidate } from "./select-bundle-page";

describe("select bundle page loader", () => {
  it("hides the page while coaching sales are closed", async () => {
    // arrange
    const loadBundlePage = vi
      .fn()
      .mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(createLoaderArguments(loadBundlePage));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("hands the request to the checkouts controller and serves its page", async () => {
    // arrange
    const page = data(
      { state: "call-first", cards: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
    const loadBundlePage = vi.fn().mockResolvedValue(page);
    const args = createLoaderArguments(loadBundlePage);

    // act
    const loaded = await loader(args);

    // assert
    expect(loadBundlePage).toHaveBeenCalledWith(args);
    expect(loaded).toBe(page);
  });

  it("forwards the loader's headers to the document", () => {
    // arrange
    const loaderHeaders = new Headers({ "Cache-Control": "no-store" });

    // act
    const forwarded = headers({
      loaderHeaders,
    } as unknown as Parameters<typeof headers>[0]);

    // assert
    expect(new Headers(forwarded).get("Cache-Control")).toBe("no-store");
  });

  it("keeps the resolved link when only the page's own query changes", () => {
    // arrange
    const args = {
      currentUrl: new URL(
        "http://localhost/select-bundle?token=abcdef&payment=cancelled",
      ),
      defaultShouldRevalidate: true,
      nextUrl: new URL("http://localhost/select-bundle?token=abcdef"),
    } as unknown as Parameters<typeof shouldRevalidate>[0];

    // act
    const revalidates = shouldRevalidate(args);

    // assert
    expect(revalidates).toBe(false);
  });

  it("resolves the link again when the token changes", () => {
    // arrange
    const args = {
      currentUrl: new URL("http://localhost/select-bundle?token=abcdef"),
      defaultShouldRevalidate: true,
      nextUrl: new URL("http://localhost/select-bundle?token=ghijkl"),
    } as unknown as Parameters<typeof shouldRevalidate>[0];

    // act
    const revalidates = shouldRevalidate(args);

    // assert
    expect(revalidates).toBe(true);
  });
});

function createLoaderArguments(loadBundlePage: ReturnType<typeof vi.fn>) {
  const feature = {
    checkouts: { loadBundlePage },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [contextEntry(coachingSalesContext, feature)],
    request: new Request("http://localhost/select-bundle?token=abcdef"),
  });
}
