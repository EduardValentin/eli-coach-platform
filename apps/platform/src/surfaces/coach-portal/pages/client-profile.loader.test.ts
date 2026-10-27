import { describe, expect, it, vi } from "vitest";

import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";
import {
  type ClientProfileFeature,
  clientProfileContext,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import type { CoachClient } from "~/bounded-contexts/clients/clients/public/coach-clients";
import {
  type ClientsFeature,
  clientsContext,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader, meta } from "./client-profile";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "andreea@example.com",
  firstName: "Andreea",
  invitation: null,
  lastName: "Popescu",
  needsRefund: false,
  coachingCancelledOrEnded: false,
  assessmentCall: {
    startsAt: "2026-09-18T12:00:00.000Z",
    firstName: "Andreea",
    lastName: "Popescu",
    email: "andreea@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
    primaryGoal: "build_strength",
    notes: null,
  },
  gender: "female",
  status: "awaiting-review",
};

const PROFILE: ClientProfileView = {
  identity: {
    firstName: "Andreea",
    lastName: "Popescu",
    email: "andreea@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
  },
  coaching: null,
  coachNotes: null,
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarUrl: null,
  startingWeightKg: null,
  currentWeightKg: null,
};

describe("coach client profile page loader", () => {
  it("reads her record and her profile side by side", async () => {
    // arrange
    const { args, loadClient, loadProfile } = routeArguments();

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({ clientId: CLIENT_ID, profile: PROFILE });
    expect(loadClient).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadProfile).toHaveBeenCalledWith(args, CLIENT_ID);
  });

  it("leaves the 404 an unknown client raises alone", async () => {
    // arrange
    const { args, loadProfile } = routeArguments();
    loadProfile.mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("leaves the denial the portal guard raises alone", async () => {
    // arrange
    const { args, loadClient } = routeArguments();
    loadClient.mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });

  it("answers not found when the route carries no client id", async () => {
    // arrange
    const { args } = routeArguments({ params: {} });

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });
});

describe("coach client profile page meta", () => {
  it("titles the page with her name's profile", () => {
    // arrange
    const data = { clientId: CLIENT_ID, profile: PROFILE };

    // act
    const descriptors = meta({ loaderData: data } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Andreea Popescu profile | Evoa" }]);
  });
});

function routeArguments(options: { params?: Record<string, string> } = {}) {
  const loadClient = vi.fn().mockResolvedValue(CLIENT);
  const loadProfile = vi.fn().mockResolvedValue(PROFILE);
  const args = createRequestArgs({
    contexts: [
      contextEntry(clientsContext, {
        coachClients: { loadClient },
      } as unknown as ClientsFeature),
      contextEntry(clientProfileContext, {
        coachProfile: { load: loadProfile },
      } as unknown as ClientProfileFeature),
    ],
    params: options.params ?? { clientId: CLIENT_ID },
    request: new Request(`http://localhost/coach/clients/${CLIENT_ID}/profile`),
  });

  return { args, loadClient, loadProfile };
}
