import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ClientRoster } from "~/features/coaching-sales/public/coach-clients";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./clients-page";

const CLIENTS_URL = "http://localhost/coach/clients";

const ROSTER: ClientRoster = {
  clients: [
    {
      bundleMonths: 3,
      clientId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      paidAt: "2026-09-20T09:00:00.000Z",
      status: "invited",
      needsRefund: false,
    },
  ],
};

describe("coach clients page loader", () => {
  it("carries the roster the coach clients controller reads for this request", async () => {
    // arrange
    const loadRoster = vi.fn().mockResolvedValue(ROSTER);
    const args = createLoaderArguments(loadRoster);

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual(ROSTER);
    expect(loadRoster).toHaveBeenCalledWith(args);
  });

  it("carries an unavailable roster as it is", async () => {
    // arrange
    const loadRoster = vi.fn().mockResolvedValue({ clients: null });

    // act
    const loaded = await loader(createLoaderArguments(loadRoster));

    // assert
    expect(loaded).toEqual({ clients: null });
  });

  it("leaves the denial the portal guard raises alone", async () => {
    // arrange
    const loadRoster = vi
      .fn()
      .mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(createLoaderArguments(loadRoster));

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });
});

describe("coach clients page revalidation", () => {
  it("answers a status, search or sort change without the server", () => {
    // arrange
    const change = {
      currentUrl: new URL(CLIENTS_URL),
      defaultShouldRevalidate: true,
      nextUrl: new URL(`${CLIENTS_URL}?status=approved&q=ana&sort=name`),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(change);

    // assert
    expect(revalidates).toBe(false);
  });

  it("re-reads the roster on an ordinary navigation", () => {
    // arrange
    const arrival = {
      currentUrl: new URL("http://localhost/coach"),
      defaultShouldRevalidate: true,
      nextUrl: new URL(CLIENTS_URL),
    } as ShouldRevalidateFunctionArgs;

    // act
    const revalidates = shouldRevalidate(arrival);

    // assert
    expect(revalidates).toBe(true);
  });
});

function createLoaderArguments(loadRoster: ReturnType<typeof vi.fn>) {
  const coachingSales = {
    coachClients: { loadRoster },
  } as unknown as CoachingSalesFeature;

  return createRequestArgs({
    contexts: [contextEntry(coachingSalesContext, coachingSales)],
    request: new Request(CLIENTS_URL),
  });
}
