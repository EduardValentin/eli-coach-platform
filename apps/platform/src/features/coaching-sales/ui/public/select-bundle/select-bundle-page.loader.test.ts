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
    const loadBundlePageShell = vi
      .fn()
      .mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(createLoaderArguments(loadBundlePageShell));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("serves the page shell the checkouts controller answers", async () => {
    // arrange
    const shell = data(null, { headers: { "Cache-Control": "no-store" } });
    const loadBundlePageShell = vi.fn().mockResolvedValue(shell);

    // act
    const loaded = await loader(createLoaderArguments(loadBundlePageShell));

    // assert
    expect(loadBundlePageShell).toHaveBeenCalledOnce();
    expect(loaded).toBe(shell);
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

  it("never reloads the shell while she stays on the page", () => {
    // arrange
    const reload = shouldRevalidate;

    // act
    const revalidates = reload();

    // assert
    expect(revalidates).toBe(false);
  });
});

function createLoaderArguments(loadBundlePageShell: ReturnType<typeof vi.fn>) {
  const feature = {
    checkouts: { loadBundlePageShell },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [contextEntry(coachingSalesContext, feature)],
    request: new Request("http://localhost/select-bundle"),
  });
}
