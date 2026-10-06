import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import { CountUnopenedResourcesUseCase } from "./count-unopened-resources-use-case";
import type { ResourceClients } from "./resource-clients";

const ADDED_AT = new Date("2026-10-05T09:00:00.000Z");
const OPENED_AT = new Date("2026-10-06T09:00:00.000Z");

function resource(
  id: string,
  options: { clientId: string; openedAt: Date | null },
): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId: options.clientId,
    title: id,
    description: "",
    file: {
      originalName: `${id}.pdf`,
      format: "pdf",
      sizeBytes: 10,
      pageCount: 1,
    },
    addedAt: ADDED_AT,
    openedAt: options.openedAt,
  });
}

class InMemoryClientResources implements ClientResources {
  private readonly stored = [
    resource("resource-new", { clientId: "client-ana", openedAt: null }),
    resource("resource-also-new", { clientId: "client-ana", openedAt: null }),
    resource("resource-opened", {
      clientId: "client-ana",
      openedAt: OPENED_AT,
    }),
    resource("resource-bea", { clientId: "client-bea", openedAt: null }),
  ];

  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async countUnopenedForClient(clientId: string): Promise<number> {
    return this.stored.filter(
      (stored) => stored.isFor(clientId) && stored.isUnopened(),
    ).length;
  }

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

  async findById(): Promise<ClientResource | null> {
    return null;
  }
}

type ResourceClient = { clientId: string; portal: "open" | "closed" };

const CLIENT_BY_SUBJECT = new Map<string, ResourceClient>([
  ["user_ana", { clientId: "client-ana", portal: "open" }],
  ["user_cleo", { clientId: "client-cleo", portal: "closed" }],
]);

function createUseCase(
  options: {
    resources?: ClientResources;
    clients?: ResourceClients;
  } = {},
) {
  const clients = options.clients ?? {
    exists: vi.fn(async () => true),
    findByAuthSubjectId: vi.fn(
      async (authSubjectId: string) =>
        CLIENT_BY_SUBJECT.get(authSubjectId) ?? null,
    ),
  };
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
    resourceListingFailed: vi.fn(),
    resourceOpeningFailed: vi.fn(),
    unopenedCountFailed: vi.fn(),
  } satisfies ClientResourceIncidents;
  const useCase = new CountUnopenedResourcesUseCase({
    resources: options.resources ?? new InMemoryClientResources(),
    clients,
    incidents,
  });

  return { useCase, incidents };
}

describe("CountUnopenedResourcesUseCase", () => {
  it("counts the resources she has not opened yet, ignoring the opened ones and other clients'", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const count = await useCase.execute({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });

    // assert
    expect(count).toBe(2);
  });

  it.each([
    ["the coach", { role: "COACH", authSubjectId: "user_eli" }],
    [
      "a client whose portal is closed",
      { role: "CLIENT", authSubjectId: "user_cleo" },
    ],
    [
      "an account bound to no client",
      { role: "CLIENT", authSubjectId: "user_nobody" },
    ],
  ] as const)("counts nothing for %s", async (_case, requester) => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const count = await useCase.execute(requester);

    // assert
    expect(count).toBe(0);
    expect(incidents.unopenedCountFailed).not.toHaveBeenCalled();
  });

  it("reports a failed count and counts nothing", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const unreadable = new InMemoryClientResources();
    vi.spyOn(unreadable, "countUnopenedForClient").mockRejectedValue(failure);
    const { useCase, incidents } = createUseCase({ resources: unreadable });

    // act
    const count = await useCase.execute({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });

    // assert
    expect(count).toBe(0);
    expect(incidents.unopenedCountFailed).toHaveBeenCalledWith({
      clientId: "client-ana",
      error: failure,
    });
  });

  it("reports a failed read of her client and counts nothing", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, incidents } = createUseCase({
      clients: {
        exists: vi.fn(async () => true),
        findByAuthSubjectId: vi.fn().mockRejectedValue(failure),
      },
    });

    // act
    const count = await useCase.execute({
      role: "CLIENT",
      authSubjectId: "user_ana",
    });

    // assert
    expect(count).toBe(0);
    expect(incidents.unopenedCountFailed).toHaveBeenCalledWith({
      clientId: null,
      error: failure,
    });
  });
});
