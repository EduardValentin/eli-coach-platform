import { describe, expect, it, vi } from "vitest";

import {
  ClientResource,
  type ClientResourceOwner,
  type ResourceFileSnapshot,
} from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResourceStore } from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import { OpenResourcePreviewUseCase } from "./open-resource-preview-use-case";
import type { ResourceClients } from "./resource-clients";

const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;

function resource(id: string, file: ResourceFileSnapshot): ClientResource {
  return ClientResource.reconstitute({
    id,
    clientId: "client-ana",
    title: id,
    description: "",
    file,
    addedAt: new Date("2026-10-05T09:00:00.000Z"),
  });
}

const STORED = [
  resource("resource-pdf", {
    originalName: "plan.pdf",
    format: "pdf",
    sizeBytes: 10,
    pageCount: 3,
  }),
  resource("resource-docx", {
    originalName: "plan.docx",
    format: "docx",
    sizeBytes: 10,
    pageCount: null,
  }),
];

class InMemoryClientResources implements ClientResources {
  async add(): Promise<void> {}

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    return (
      STORED.find((stored) => stored.toSnapshot().id === resourceId) ?? null
    );
  }
}

class InMemoryResourceImages implements ClientResourceStore {
  private readonly images = new Map<string, Uint8Array>([
    ["resource-pdf/page-1", Uint8Array.of(1)],
    ["resource-pdf/page-2", Uint8Array.of(2)],
    ["resource-pdf/page-3", Uint8Array.of(3)],
    ["resource-pdf/thumbnail", Uint8Array.of(0)],
  ]);

  readonly openPage = vi.fn(
    async (owner: ClientResourceOwner, pageNumber: number) =>
      this.images.get(`${owner.resourceId}/page-${pageNumber}`) ?? null,
  );

  readonly openThumbnail = vi.fn(
    async (owner: ClientResourceOwner) =>
      this.images.get(`${owner.resourceId}/thumbnail`) ?? null,
  );

  async storeOriginal(): Promise<void> {}
  async storePage(): Promise<void> {}
  async storeThumbnail(): Promise<void> {}
  async openOriginal(): Promise<null> {
    return null;
  }
  async remove(): Promise<void> {}
}

function createUseCase() {
  const store = new InMemoryResourceImages();
  const clients = {
    exists: vi.fn(async () => true),
    findByAuthSubjectId: vi.fn(async (authSubjectId: string) =>
      authSubjectId === "user_ana" ? { clientId: "client-ana" } : null,
    ),
  } satisfies ResourceClients;
  const incidents = {
    resourceStored: vi.fn(),
    resourceRefused: vi.fn(),
    resourceAccessRefused: vi.fn(),
    resourceStorageFailed: vi.fn(),
  } satisfies ClientResourceIncidents;
  const useCase = new OpenResourcePreviewUseCase({
    resources: new InMemoryClientResources(),
    clients,
    store,
    incidents,
  });

  return { useCase, store, incidents };
}

describe("OpenResourcePreviewUseCase", () => {
  it.each([
    ["the coach", COACH],
    ["the client it is for", { role: "CLIENT", authSubjectId: "user_ana" }],
  ] as const)("opens a page image for %s", async (_case, requester) => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      requester,
      resourceId: "resource-pdf",
      preview: { kind: "page", pageNumber: 2 },
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      bytes: Uint8Array.of(2),
      mimeType: "image/webp",
    });
  });

  it("opens the thumbnail", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-pdf",
      preview: { kind: "thumbnail" },
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      bytes: Uint8Array.of(0),
      mimeType: "image/webp",
    });
  });

  it("finds nothing for another client and reports the refusal", async () => {
    // arrange
    const { useCase, store, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "CLIENT", authSubjectId: "user_bea" },
      resourceId: "resource-pdf",
      preview: { kind: "page", pageNumber: 1 },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.openPage).not.toHaveBeenCalled();
    expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
      requesterRole: "CLIENT",
      clientId: "client-ana",
      resourceId: "resource-pdf",
    });
  });

  it.each([
    ["an unknown resource", "resource-404", { kind: "page", pageNumber: 1 }],
    ["page zero", "resource-pdf", { kind: "page", pageNumber: 0 }],
    ["a page past the last", "resource-pdf", { kind: "page", pageNumber: 4 }],
    ["a page of a Word file", "resource-docx", { kind: "page", pageNumber: 1 }],
    ["a Word file's thumbnail", "resource-docx", { kind: "thumbnail" }],
  ] as const)(
    "finds nothing for %s without reading the store",
    async (_case, resourceId, preview) => {
      // arrange
      const { useCase, store } = createUseCase();

      // act
      const result = await useCase.execute({
        requester: COACH,
        resourceId,
        preview,
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(store.openPage).not.toHaveBeenCalled();
      expect(store.openThumbnail).not.toHaveBeenCalled();
    },
  );

  it("finds nothing when the stored page image is gone", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    store.openPage.mockResolvedValueOnce(null);

    // act
    const result = await useCase.execute({
      requester: COACH,
      resourceId: "resource-pdf",
      preview: { kind: "page", pageNumber: 1 },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
