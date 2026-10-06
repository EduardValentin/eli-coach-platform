import { describe, expect, it, vi } from "vitest";

import type { ClientResourceView } from "~/features/client-resources/contracts/client-resources";
import type { CoachResourceListing } from "~/features/client-resources/ui/coach/resources/coach-resource-library";
import type { ClientResourcesFeature } from "~/features/client-resources/server/client-resources-composition.server";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./client-resources";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "andreea@example.com",
  firstName: "Andreea",
  invitation: null,
  lastName: "Popescu",
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
  subscription: null,
};

const RESOURCES: ClientResourceView[] = [
  {
    id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    title: "Glute activation warm-up",
    description: "Run through this before every lower-body session.",
    file: {
      originalName: "glute-activation-warm-up.pdf",
      downloadName: "glute-activation-warm-up.pdf",
      kind: "pdf",
      sizeBytes: 1_840_000,
      pageCount: 6,
    },
    addedAt: "2026-10-03T09:00:00.000Z",
  },
];

describe("coach client resources page loader", () => {
  it("reads her record and her resources for this request, side by side", async () => {
    // arrange
    const { args, loadClient, loadResources } = routeArguments();

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      client: CLIENT,
      listing: { status: "ready", resources: RESOURCES },
    });
    expect(loadClient).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadResources).toHaveBeenCalledWith(args, CLIENT_ID);
  });

  it("leaves the 404 an unknown client raises alone", async () => {
    // arrange
    const { args, loadResources } = routeArguments();
    loadResources.mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("still reads her record when her resources cannot be read, and says the listing failed", async () => {
    // arrange
    const { args, loadResources } = routeArguments();
    loadResources.mockRejectedValue(
      new Error("The resources could not be read."),
    );

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({ client: CLIENT, listing: { status: "failed" } });
  });

  it("leaves the denial the portal guard raises alone", async () => {
    // arrange
    const { args, loadResources } = routeArguments();
    loadResources.mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });

  it("leaves a failed read of her record alone for the error boundary", async () => {
    // arrange
    const { args, loadClient } = routeArguments();
    const failure = new Error("The client could not be read.");
    loadClient.mockRejectedValue(failure);

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toBe(failure);
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

describe("coach client resources page meta", () => {
  it("titles the page with her first name's resources", () => {
    // arrange
    const data = {
      client: CLIENT,
      listing: {
        status: "ready",
        resources: RESOURCES,
      } as CoachResourceListing,
    };

    // act
    const descriptors = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Andreea’s resources | Evoa" }]);
  });
});

function routeArguments(options: { params?: Record<string, string> } = {}) {
  const loadClient = vi.fn().mockResolvedValue(CLIENT);
  const loadResources = vi.fn().mockResolvedValue(RESOURCES);
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        coachClients: { loadClient },
      } as unknown as CoachingSalesFeature),
      contextEntry(clientResourcesContext, {
        coachResources: { load: loadResources },
      } as unknown as ClientResourcesFeature),
    ],
    params: options.params ?? { clientId: CLIENT_ID },
    request: new Request(
      `http://localhost/coach/clients/${CLIENT_ID}/resources`,
    ),
  });

  return { args, loadClient, loadResources };
}
