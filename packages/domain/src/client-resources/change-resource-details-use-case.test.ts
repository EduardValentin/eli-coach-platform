import { describe, expect, it, vi } from "vitest";

import { ChangeResourceDetailsUseCase } from "./change-resource-details-use-case";
import { ClientResource } from "./client-resource";
import type { ResourceRequester } from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { BrowsedResources, ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
} from "./resource-details";
import {
  MAX_RESOURCE_TAG_LENGTH,
  type ResourceTagSnapshot,
} from "./resource-tags";

const ADDED_AT = new Date("2026-10-05T09:00:00.000Z");
const OPENED_AT = new Date("2026-10-06T09:00:00.000Z");
const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;
const MEAL_PREP = { tag: "Meal Prep", folded: "meal prep" };
const CARDIO = { tag: "Cardio", folded: "cardio" };
const ACCOUNT_WITHOUT_RESOURCE_ROLE = {
  role: "USER",
  authSubjectId: "user_ana",
} as unknown as ResourceRequester;

const STORED = ClientResource.reconstitute({
  id: "resource-1",
  clientId: "client-ana",
  title: "Meal plan",
  description: "Week one",
  tags: [CARDIO],
  file: {
    originalName: "plan.pdf",
    format: "pdf",
    sizeBytes: 2_048,
    pageCount: 4,
  },
  addedAt: ADDED_AT,
  openedAt: OPENED_AT,
});

class InMemoryClientResources implements ClientResources {
  private readonly stored = new Map<string, ClientResource>([
    ["resource-1", STORED],
  ]);

  readonly saveDetails = vi.fn(async (resource: ClientResource) => {
    this.stored.set(resource.toSnapshot().id, resource);
  });

  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async remove(): Promise<void> {}

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

  async browseForClient(): Promise<BrowsedResources> {
    return { resources: [], tagOptions: [], searched: 0, total: 0 };
  }

  async tagsHeldBy(): Promise<ResourceTagSnapshot[]> {
    return [];
  }

  readonly tagVocabulary = vi.fn(async (): Promise<ResourceTagSnapshot[]> => [
    CARDIO,
    MEAL_PREP,
  ]);

  async findById(resourceId: string): Promise<ClientResource | null> {
    return this.stored.get(resourceId) ?? null;
  }

  snapshotOf(resourceId: string) {
    return this.stored.get(resourceId)?.toSnapshot();
  }
}

function createUseCase() {
  const resources = new InMemoryClientResources();
  const clients = {
    exists: vi.fn(async () => true),
    findByAuthSubjectId: vi.fn(async () => ({
      clientId: "client-ana",
      portal: "reachable" as const,
    })),
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
  const useCase = new ChangeResourceDetailsUseCase({
    resources,
    clients,
    incidents,
  });

  return { useCase, resources, incidents };
}

describe("ChangeResourceDetailsUseCase", () => {
  it("saves the trimmed title, description and tags, keeps the moment she opened it and every other field, and answers the changed resource", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details: {
        title: "  Meal plan v2 ",
        description: " Week two  ",
        tags: ["meal PREP", "Recovery"],
      },
    });

    // assert
    const changed = {
      ...STORED.toSnapshot(),
      title: "Meal plan v2",
      description: "Week two",
      tags: [MEAL_PREP, { tag: "Recovery", folded: "recovery" }],
    };
    expect(result).toEqual({
      status: "changed",
      resource: ClientResource.reconstitute(changed),
    });
    expect(resources.snapshotOf("resource-1")).toEqual(changed);
  });

  it.each([
    [
      "a blank title",
      { title: "   ", description: "Week two", tags: [] },
      { title: "missing" },
    ],
    [
      "an overlong title",
      {
        title: "a".repeat(MAX_RESOURCE_TITLE_LENGTH + 1),
        description: "",
        tags: [],
      },
      { title: "too-long" },
    ],
    [
      "an overlong description",
      {
        title: "Meal plan",
        description: "a".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
        tags: [],
      },
      { description: "too-long" },
    ],
    [
      "an overlong tag",
      {
        title: "Meal plan",
        description: "",
        tags: ["a".repeat(MAX_RESOURCE_TAG_LENGTH + 1)],
      },
      { tags: "too-long" },
    ],
  ])("refuses %s without a write", async (_case, details, problems) => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details,
    });

    // assert
    expect(result).toEqual({ status: "invalid-details", problems });
    expect(resources.saveDetails).not.toHaveBeenCalled();
    expect(resources.snapshotOf("resource-1")).toEqual(STORED.toSnapshot());
  });

  it.each([
    ["the client it is for", ANA],
    [
      "an account in neither the coach nor the client role",
      ACCOUNT_WITHOUT_RESOURCE_ROLE,
    ],
  ])(
    "finds nothing for %s and reports the refusal",
    async (_case, requester) => {
      // arrange
      const { useCase, resources, incidents } = createUseCase();

      // act
      const result = await useCase.execute({
        requester,
        resourceId: "resource-1",
        details: { title: "Meal plan v2", description: "", tags: [] },
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(resources.saveDetails).not.toHaveBeenCalled();
      expect(incidents.resourceAccessRefused).toHaveBeenCalledOnce();
    },
  );

  it("finds nothing to change for an unknown resource", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-404",
      details: { title: "Meal plan v2", description: "", tags: [] },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(resources.saveDetails).not.toHaveBeenCalled();
  });

  it("clears every tag when none is given", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details: { title: "Meal plan", description: "Week one", tags: [] },
    });

    // assert
    expect(resources.snapshotOf("resource-1")?.tags).toEqual([]);
  });

  it("reports a failed read of the tag vocabulary and answers that the change failed without a write", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, resources, incidents } = createUseCase();
    resources.tagVocabulary.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details: { title: "Meal plan v2", description: "", tags: ["Cardio"] },
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(resources.saveDetails).not.toHaveBeenCalled();
    expect(incidents.resourceChangeFailed).toHaveBeenCalledWith({
      clientId: "client-ana",
      resourceId: "resource-1",
      error: failure,
    });
  });

  it("reports a failed write and answers that the change failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, resources, incidents } = createUseCase();
    resources.saveDetails.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details: { title: "Meal plan v2", description: "", tags: [] },
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.resourceChangeFailed).toHaveBeenCalledWith({
      clientId: "client-ana",
      resourceId: "resource-1",
      error: failure,
    });
  });
});
