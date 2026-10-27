import type { ShouldRevalidateFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ClientProfileFeature } from "~/bounded-contexts/clients/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/server/guards/client-profile-context.server";
import type { ClientRoster } from "~/bounded-contexts/clients/clients/public/coach-clients";
import type { ClientsFeature } from "~/bounded-contexts/clients/clients/server/clients-composition.server";
import { clientsContext } from "~/bounded-contexts/clients/clients/server/guards/clients-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, shouldRevalidate } from "./clients";

const CLIENTS_URL = "http://localhost/coach/clients";

const ANA_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const ROSTER: ClientRoster = {
  clients: [
    {
      bundleMonths: 3,
      clientId: ANA_ID,
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      joinedAt: "2026-09-20T09:00:00.000Z",
      status: "invited",
      needsRefund: false,
    },
  ],
};

describe("coach clients page loader", () => {
  it("carries the roster with each client's picture the client profile reads for this request", async () => {
    // arrange
    const loadRoster = vi.fn().mockResolvedValue(ROSTER);
    const urlsFor = vi.fn().mockResolvedValue({
      [ANA_ID]: `/api/client-profile/avatar/${ANA_ID}`,
    });
    const args = createLoaderArguments(loadRoster, urlsFor);

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      avatarUrls: { [ANA_ID]: `/api/client-profile/avatar/${ANA_ID}` },
      clients: ROSTER.clients,
    });
    expect(loadRoster).toHaveBeenCalledWith(args);
    expect(urlsFor).toHaveBeenCalledWith(args, [ANA_ID]);
  });

  it("carries an unavailable roster as it is, without reading pictures", async () => {
    // arrange
    const loadRoster = vi.fn().mockResolvedValue({ clients: null });
    const urlsFor = vi.fn();

    // act
    const loaded = await loader(createLoaderArguments(loadRoster, urlsFor));

    // assert
    expect(loaded).toEqual({ avatarUrls: {}, clients: null });
    expect(urlsFor).not.toHaveBeenCalled();
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

function createLoaderArguments(
  loadRoster: ReturnType<typeof vi.fn>,
  urlsFor: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({}),
) {
  const clients = {
    coachClients: { loadRoster },
  } as unknown as ClientsFeature;
  const clientProfile = {
    coachAvatars: { urlsFor },
  } as unknown as ClientProfileFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(clientsContext, clients),
      contextEntry(clientProfileContext, clientProfile),
    ],
    request: new Request(CLIENTS_URL),
  });
}
