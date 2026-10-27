import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { BrowsedResources, ClientResources } from "./client-resources";
import { ListOwnResourcesUseCase } from "./list-own-resources-use-case";
import type { ClientReach, ClientReachReading } from "./client-reach";
import type { ResourceTagSnapshot } from "./resource-tags";

const MEAL_PREP = { tag: "Meal Prep", folded: "meal prep" };
const GLUTES = { tag: "Glutes", folded: "glutes" };
const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;
const NOTHING_CHOSEN = { tag: null, search: null, sort: null, direction: null };

function resource(id: string, clientId: string): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId,
    title: id,
    description: "",
    tags: [MEAL_PREP],
    file: {
      originalName: `${id}.pdf`,
      format: "pdf",
      sizeBytes: 10,
      pageCount: 1,
    },
    addedAt: new Date("2026-10-05T09:00:00.000Z"),
    openedAt: null,
  });
}

const NEWER = resource("resource-newer", "client-ana");
const OLDER = resource("resource-older", "client-ana");

const TAGS_HELD_BY_CLIENT = new Map<string, ResourceTagSnapshot[]>([
  ["client-ana", [MEAL_PREP]],
  ["client-bea", [GLUTES]],
]);

class InMemoryClientResources implements ClientResources {
  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async saveDetails(): Promise<void> {}

  async remove(): Promise<void> {}

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

  async browseForClient(clientId: string): Promise<BrowsedResources> {
    const resources = [
      NEWER,
      OLDER,
      resource("resource-bea", "client-bea"),
    ].filter((stored) => stored.isFor(clientId));

    return {
      resources,
      tagOptions: [{ tag: MEAL_PREP, count: resources.length }],
      searched: resources.length,
      total: resources.length,
    };
  }

  async tagsHeldBy(clientId: string): Promise<ResourceTagSnapshot[]> {
    return TAGS_HELD_BY_CLIENT.get(clientId) ?? [];
  }

  async tagVocabulary(): Promise<ResourceTagSnapshot[]> {
    return [GLUTES, MEAL_PREP];
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
  resources: ClientResources = new InMemoryClientResources(),
) {
  const clients = {
    findById: vi.fn(async (clientId: string) =>
      reachReading(clientId, "reachable"),
    ),
    findByAuthSubjectId: vi.fn(
      async (authSubjectId: string) =>
        CLIENT_BY_SUBJECT.get(authSubjectId) ?? null,
    ),
  } satisfies Pick<ClientReach, "findByAuthSubjectId" | "findById">;
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
  } satisfies ClientResourceIncidents;
  const useCase = new ListOwnResourcesUseCase({
    resources,
    clients,
    incidents,
  });

  return { useCase, clients, incidents };
}

describe("ListOwnResourcesUseCase", () => {
  it("answers only her own resources, newest first, with her tag options, to a client whose portal is reachable", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: ANA,
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).toEqual({
      status: "listed",
      browsing: {
        resources: [NEWER, OLDER],
        tagOptions: [{ tag: MEAL_PREP, count: 2 }],
        searched: 2,
        total: 2,
      },
      browse: { tag: null, search: "", sort: "added", direction: "desc" },
    });
  });

  it("browses by a tag she holds in its stored spelling, with the search and sort chosen", async () => {
    // arrange
    const resources = new InMemoryClientResources();
    const browseForClient = vi.spyOn(resources, "browseForClient");
    const { useCase } = createUseCase(resources);
    const expectedBrowse = {
      tag: MEAL_PREP,
      search: "plan",
      sort: "title",
      direction: "asc",
    };

    // act
    const result = await useCase.execute({
      requester: ANA,
      browse: {
        tag: "MEAL PREP",
        search: "plan",
        sort: "title",
        direction: null,
      },
    });

    // assert
    expect(browseForClient).toHaveBeenCalledWith("client-ana", expectedBrowse);
    expect(result).toMatchObject({ status: "listed", browse: expectedBrowse });
  });

  it("browses with no tag when she holds none like the one asked for, even if another client does", async () => {
    // arrange
    const resources = new InMemoryClientResources();
    const browseForClient = vi.spyOn(resources, "browseForClient");
    const { useCase } = createUseCase(resources);

    // act
    const result = await useCase.execute({
      requester: ANA,
      browse: { ...NOTHING_CHOSEN, tag: "Glutes" },
    });

    // assert
    const fallback = {
      tag: null,
      search: "",
      sort: "added",
      direction: "desc",
    };
    expect(browseForClient).toHaveBeenCalledWith("client-ana", fallback);
    expect(result).toMatchObject({ status: "listed", browse: fallback });
  });

  it("never reads the coach's vocabulary for a client", async () => {
    // arrange
    const resources = new InMemoryClientResources();
    const tagVocabulary = vi.spyOn(resources, "tagVocabulary");
    const { useCase } = createUseCase(resources);

    // act
    const result = await useCase.execute({
      requester: ANA,
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).not.toHaveProperty("vocabulary");
    expect(tagVocabulary).not.toHaveBeenCalled();
  });

  it.each([
    ["a client whose coaching has ended", "user_cleo"],
    ["a client still awaiting onboarding", "user_dana"],
    ["an account bound to no client", "user_nobody"],
  ])("finds nothing for %s", async (_case, authSubjectId) => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "CLIENT", authSubjectId },
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
  });

  it("finds nothing for the coach, who has no resources of her own", async () => {
    // arrange
    const { useCase, clients } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(clients.findByAuthSubjectId).not.toHaveBeenCalled();
  });

  it.each(["tagsHeldBy", "browseForClient"] as const)(
    "reports a failed read of %s and answers that the listing is unavailable",
    async (read) => {
      // arrange
      const failure = new Error("connection terminated");
      const unreadable = new InMemoryClientResources();
      vi.spyOn(unreadable, read).mockRejectedValue(failure);
      const { useCase, incidents } = createUseCase(unreadable);

      // act
      const result = await useCase.execute({
        requester: ANA,
        browse: NOTHING_CHOSEN,
      });

      // assert
      expect(result).toEqual({ status: "unavailable" });
      expect(incidents.resourceListingFailed).toHaveBeenCalledWith({
        clientId: "client-ana",
        error: failure,
      });
    },
  );
});
