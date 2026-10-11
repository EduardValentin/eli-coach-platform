import { describe, expect, it, vi } from "vitest";

import { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { BrowsedResources, ClientResources } from "./client-resources";
import { ListClientResourcesUseCase } from "./list-client-resources-use-case";
import type { ResourceBrowseSnapshot } from "./resource-browse";
import type { ResourceClients } from "./resource-clients";
import type { ResourceTagSnapshot } from "./resource-tags";

const MEAL_PREP = { tag: "Meal Prep", folded: "meal prep" };
const GLUTES = { tag: "Glutes", folded: "glutes" };
const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
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

  async browseForClient(
    clientId: string,
    browse: ResourceBrowseSnapshot,
  ): Promise<BrowsedResources> {
    const resources = [NEWER, OLDER, resource("resource-bea", "client-bea")]
      .filter((stored) => stored.isFor(clientId))
      .filter(() => browse.search !== "nothing like it");

    return {
      resources,
      tagOptions: [{ tag: MEAL_PREP, count: resources.length }],
      searched: resources.length,
      total: 2,
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

function createUseCase(
  resources: ClientResources = new InMemoryClientResources(),
) {
  const clients = {
    exists: vi.fn(async (clientId: string) =>
      ["client-ana", "client-bea"].includes(clientId),
    ),
    findByAuthSubjectId: vi.fn(async (authSubjectId: string) =>
      authSubjectId === "user_ana"
        ? { clientId: "client-ana", portal: "reachable" as const }
        : null,
    ),
  } satisfies ResourceClients;
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
  const useCase = new ListClientResourcesUseCase({
    resources,
    clients,
    incidents,
  });

  return { useCase, incidents };
}

describe("ListClientResourcesUseCase", () => {
  it.each([
    ["the coach", COACH],
    ["the client herself", { role: "CLIENT", authSubjectId: "user_ana" }],
  ] as const)(
    "answers a client's resources, newest first, with her tag options and the coach's vocabulary for %s",
    async (_case, requester) => {
      // arrange
      const { useCase } = createUseCase();

      // act
      const result = await useCase.execute({
        requester,
        clientId: "client-ana",
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
        vocabulary: [GLUTES, MEAL_PREP],
      });
    },
  );

  it("browses by a tag she holds in its stored spelling, with the search and sort chosen", async () => {
    // arrange
    const resources = new InMemoryClientResources();
    const browseForClient = vi.spyOn(resources, "browseForClient");
    const { useCase } = createUseCase(resources);
    const expectedBrowse = {
      tag: MEAL_PREP,
      search: "plan",
      sort: "title",
      direction: "desc",
    };

    // act
    const result = await useCase.execute({
      requester: COACH,
      clientId: "client-ana",
      browse: {
        tag: "meal prep",
        search: " plan ",
        sort: "title",
        direction: "desc",
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
      requester: COACH,
      clientId: "client-ana",
      browse: { ...NOTHING_CHOSEN, tag: "Glutes", search: "plan" },
    });

    // assert
    const fallback = {
      tag: null,
      search: "plan",
      sort: "added",
      direction: "desc",
    };
    expect(browseForClient).toHaveBeenCalledWith("client-ana", fallback);
    expect(result).toMatchObject({ status: "listed", browse: fallback });
  });

  it("answers an empty list with the counts that tell no matches from no resources", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      clientId: "client-ana",
      browse: { ...NOTHING_CHOSEN, search: "nothing like it" },
    });

    // assert
    expect(result).toMatchObject({
      status: "listed",
      browsing: {
        resources: [],
        tagOptions: [{ tag: MEAL_PREP, count: 0 }],
        searched: 0,
        total: 2,
      },
    });
  });

  it("finds nothing for another client and reports the refusal", async () => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
      clientId: "client-bea",
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
      requesterRole: "CLIENT",
      clientId: "client-bea",
      resourceId: null,
    });
  });

  it("finds nothing for a client who does not exist", async () => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      clientId: "client-404",
      browse: NOTHING_CHOSEN,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
  });

  it.each(["tagsHeldBy", "browseForClient", "tagVocabulary"] as const)(
    "reports a failed read of %s and answers that the listing is unavailable",
    async (read) => {
      // arrange
      const failure = new Error("connection terminated");
      const unreadable = new InMemoryClientResources();
      vi.spyOn(unreadable, read).mockRejectedValue(failure);
      const { useCase, incidents } = createUseCase(unreadable);

      // act
      const result = await useCase.execute({
        requester: COACH,
        clientId: "client-ana",
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
