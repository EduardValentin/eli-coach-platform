import { data } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { headers, loader } from "./checkout-complete-page";

describe("checkout complete page loader", () => {
  it("hides the page while coaching sales are closed", async () => {
    // arrange
    const loadConfirmation = vi
      .fn()
      .mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(createLoaderArguments(loadConfirmation));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("hands the request to the checkouts controller and serves its confirmation", async () => {
    // arrange
    const page = data({ state: "call-first" });
    const loadConfirmation = vi.fn().mockResolvedValue(page);
    const args = createLoaderArguments(loadConfirmation);

    // act
    const loaded = await loader(args);

    // assert
    expect(loadConfirmation).toHaveBeenCalledWith(args);
    expect(loaded).toBe(page);
  });

  it("forwards the loader's headers to the document", () => {
    // arrange
    const loaderHeaders = new Headers({ "Referrer-Policy": "no-referrer" });

    // act
    const forwarded = headers({
      loaderHeaders,
    } as unknown as Parameters<typeof headers>[0]);

    // assert
    expect(new Headers(forwarded).get("Referrer-Policy")).toBe("no-referrer");
  });
});

function createLoaderArguments(loadConfirmation: ReturnType<typeof vi.fn>) {
  const feature = {
    checkouts: { loadConfirmation },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [contextEntry(coachingSalesContext, feature)],
    request: new Request("http://localhost/checkout/complete?session=cs_1"),
  });
}
