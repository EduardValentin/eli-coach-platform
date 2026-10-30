import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type {
  BrowsedResources,
  ClientResourcesPort,
} from "./client-resources-port";
import { CountUnopenedResourcesUseCase } from "./count-unopened-resources-use-case";
import type { ClientReachPort, ClientReachReading } from "./client-reach-port";
import type { ResourceTagSnapshot } from "./resource-tags";

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
    tags: [],
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

class InMemoryClientResourcesAdapter implements ClientResourcesPort {
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

  async saveDetails(): Promise<void> {}

  async remove(): Promise<void> {}

  async countUnopenedForClient(clientId: string): Promise<number> {
    return this.stored.filter(
      (stored) => stored.isFor(clientId) && stored.isUnopened(),
    ).length;
  }

  async browseForClient(): Promise<BrowsedResources> {
    return { resources: [], tagOptions: [], searched: 0, total: 0 };
  }

  async tagsHeldBy(): Promise<ResourceTagSnapshot[]> {
    return [];
  }

  async tagVocabulary(): Promise<ResourceTagSnapshot[]> {
    return [];
  }

  async findById(): Promise<ClientResource | null> {
    return null;
  }
}

function reachReading(
  clientId: string,
  portal: ClientReachReading["portal"],
): ClientReachReading {
  return {
    clientId,
    portal,
    coachingEndsAt: null,
    programStartsAt: null,
    paidThrough: null,
    timeZone: "Europe/Bucharest",
  };
}

const CLIENT_BY_SUBJECT = new Map<string, ClientReachReading>([
  ["user_ana", reachReading("client-ana", "reachable")],
  ["user_cleo", reachReading("client-cleo", "ended")],
  ["user_dana", reachReading("client-dana", "awaiting_onboarding")],
]);

function createUseCase(
  options: {
    resources?: ClientResourcesPort;
    clients?: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  } = {},
) {
  const clients = options.clients ?? {
    findById: vi.fn(async (clientId: string) =>
      reachReading(clientId, "reachable"),
    ),
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
    resourceChangeFailed: vi.fn(),
    resourceFilesOrphaned: vi.fn(),
    unopenedCountFailed: vi.fn(),
  } satisfies ClientResourceIncidentsPort;
  const useCase = new CountUnopenedResourcesUseCase({
    resources: options.resources ?? new InMemoryClientResourcesAdapter(),
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
      "a client whose coaching has ended",
      { role: "CLIENT", authSubjectId: "user_cleo" },
    ],
    [
      "a client still awaiting onboarding",
      { role: "CLIENT", authSubjectId: "user_dana" },
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
    const unreadable = new InMemoryClientResourcesAdapter();
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
        findById: vi.fn(async (clientId: string) =>
          reachReading(clientId, "reachable"),
        ),
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
