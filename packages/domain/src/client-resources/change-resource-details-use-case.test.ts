import { describe, expect, it, vi } from "vitest";

import { ChangeResourceDetailsUseCase } from "./change-resource-details-use-case";
import { ClientResource } from "./client-resource";
import type { ResourceRequester } from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
} from "./resource-details";

const ADDED_AT = new Date("2026-10-05T09:00:00.000Z");
const OPENED_AT = new Date("2026-10-06T09:00:00.000Z");
const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;
const ACCOUNT_WITHOUT_RESOURCE_ROLE = {
  role: "USER",
  authSubjectId: "user_ana",
} as unknown as ResourceRequester;

const STORED = ClientResource.reconstitute({
  id: "resource-1",
  clientId: "client-ana",
  title: "Meal plan",
  description: "Week one",
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

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

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
      portal: "open" as const,
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
  it("saves the trimmed title and description, keeps the moment she opened it and every other field, and answers the changed resource", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
      details: { title: "  Meal plan v2 ", description: " Week two  " },
    });

    // assert
    const changed = {
      ...STORED.toSnapshot(),
      title: "Meal plan v2",
      description: "Week two",
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
      { title: "   ", description: "Week two" },
      { title: "missing" },
    ],
    [
      "an overlong title",
      { title: "a".repeat(MAX_RESOURCE_TITLE_LENGTH + 1), description: "" },
      { title: "too-long" },
    ],
    [
      "an overlong description",
      {
        title: "Meal plan",
        description: "a".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
      },
      { description: "too-long" },
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
        details: { title: "Meal plan v2", description: "" },
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
      details: { title: "Meal plan v2", description: "" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(resources.saveDetails).not.toHaveBeenCalled();
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
      details: { title: "Meal plan v2", description: "" },
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
