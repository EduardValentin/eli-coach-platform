import { describe, expect, it, vi } from "vitest";

import { ClientResource, type ClientResourceOwner } from "./client-resource";
import type { ResourceRequester } from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResourceStore } from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import { RemoveClientResourceUseCase } from "./remove-client-resource-use-case";
import type { ResourceClients } from "./resource-clients";

const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
const ANA = { role: "CLIENT", authSubjectId: "user_ana" } as const;
const ACCOUNT_WITHOUT_RESOURCE_ROLE = {
  role: "USER",
  authSubjectId: "user_ana",
} as unknown as ResourceRequester;
const OWNER = { clientId: "client-ana", resourceId: "resource-1" };

const STORED = ClientResource.reconstitute({
  id: "resource-1",
  clientId: "client-ana",
  title: "Meal plan",
  description: "",
  file: {
    originalName: "plan.pdf",
    format: "pdf",
    sizeBytes: 2_048,
    pageCount: 1,
  },
  addedAt: new Date("2026-10-05T09:00:00.000Z"),
  openedAt: null,
});

class InMemoryClientResources implements ClientResources {
  private readonly stored = new Map<string, ClientResource>([
    ["resource-1", STORED],
  ]);

  constructor(private readonly removals: string[]) {}

  readonly remove = vi.fn(async (resourceId: string) => {
    this.removals.push(`row ${resourceId}`);
    this.stored.delete(resourceId);
  });

  async add(): Promise<void> {}

  async recordOpened(): Promise<void> {}

  async saveDetails(): Promise<void> {}

  async countUnopenedForClient(): Promise<number> {
    return 0;
  }

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    return this.stored.get(resourceId) ?? null;
  }

  has(resourceId: string): boolean {
    return this.stored.has(resourceId);
  }
}

class InMemoryResourceStore implements ClientResourceStore {
  private readonly files = new Set(["original", "page-1", "thumbnail"]);

  constructor(private readonly removals: string[]) {}

  readonly remove = vi.fn(async (owner: ClientResourceOwner) => {
    this.removals.push(`files ${owner.resourceId}`);
    this.files.clear();
  });

  async storeOriginal(): Promise<void> {}

  async storePage(): Promise<void> {}

  async storeThumbnail(): Promise<void> {}

  async openOriginal(): Promise<null> {
    return null;
  }

  async openPage(): Promise<null> {
    return null;
  }

  async openThumbnail(): Promise<null> {
    return null;
  }

  storedNames(): string[] {
    return [...this.files];
  }
}

function createUseCase() {
  const removals: string[] = [];
  const resources = new InMemoryClientResources(removals);
  const store = new InMemoryResourceStore(removals);
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
  const useCase = new RemoveClientResourceUseCase({
    resources,
    clients,
    store,
    incidents,
  });

  return { useCase, resources, store, incidents, removals };
}

describe("RemoveClientResourceUseCase", () => {
  it("removes the row before the files", async () => {
    // arrange
    const { useCase, resources, store, incidents, removals } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
    });

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(removals).toEqual(["row resource-1", "files resource-1"]);
    expect(store.remove).toHaveBeenCalledWith(OWNER);
    expect(resources.has("resource-1")).toBe(false);
    expect(store.storedNames()).toEqual([]);
    expect(incidents.resourceFilesOrphaned).not.toHaveBeenCalled();
  });

  it("answers removed and reports the orphaned files when they cannot be removed after the row", async () => {
    // arrange
    const failure = new Error("EACCES: permission denied");
    const { useCase, resources, store, incidents } = createUseCase();
    store.remove.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
    });

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(resources.has("resource-1")).toBe(false);
    expect(incidents.resourceFilesOrphaned).toHaveBeenCalledWith({
      ...OWNER,
      error: failure,
    });
  });

  it("answers failed, leaves the files and reports the failed change when the row cannot be removed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, resources, store, incidents } = createUseCase();
    resources.remove.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-1",
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.remove).not.toHaveBeenCalled();
    expect(store.storedNames()).toEqual(["original", "page-1", "thumbnail"]);
    expect(incidents.resourceChangeFailed).toHaveBeenCalledWith({
      ...OWNER,
      error: failure,
    });
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
      const { useCase, resources, store, incidents } = createUseCase();

      // act
      const result = await useCase.execute({
        requester,
        resourceId: "resource-1",
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(resources.has("resource-1")).toBe(true);
      expect(store.remove).not.toHaveBeenCalled();
      expect(incidents.resourceAccessRefused).toHaveBeenCalledOnce();
    },
  );

  it("finds nothing to remove for an unknown resource", async () => {
    // arrange
    const { useCase, resources, store } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(resources.remove).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });
});
