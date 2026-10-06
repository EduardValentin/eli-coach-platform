import { describe, expect, it, vi } from "vitest";

import { ClientResource, type ClientResourceOwner } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type {
  ClientResourceStore,
  StoredResourceOriginal,
} from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import { DownloadClientResourceUseCase } from "./download-client-resource-use-case";
import type { ResourceClients } from "./resource-clients";

const ORIGINAL_BYTES = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0);
const RESOURCE = ClientResource.reconstitute({
  id: "resource-1",
  clientId: "client-ana",
  title: "Shopping list",
  description: "",
  file: {
    originalName: "Shopping list.txt",
    format: "xls",
    sizeBytes: ORIGINAL_BYTES.byteLength,
    pageCount: null,
  },
  addedAt: new Date("2026-10-05T09:00:00.000Z"),
});

async function* chunksOf(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  yield bytes.subarray(0, 2);
  yield bytes.subarray(2);
}

async function collect(chunks: AsyncIterable<Uint8Array>): Promise<number[]> {
  const collected: number[] = [];

  for await (const chunk of chunks) collected.push(...chunk);

  return collected;
}

class InMemoryClientResources implements ClientResources {
  async add(): Promise<void> {}

  async listForClient(): Promise<ClientResource[]> {
    return [];
  }

  async findById(resourceId: string): Promise<ClientResource | null> {
    return resourceId === "resource-1" ? RESOURCE : null;
  }
}

class InMemoryOriginals implements ClientResourceStore {
  readonly openOriginal = vi.fn(
    async (
      owner: ClientResourceOwner,
    ): Promise<StoredResourceOriginal | null> =>
      owner.resourceId === "resource-1"
        ? {
            bytes: chunksOf(ORIGINAL_BYTES),
            sizeBytes: ORIGINAL_BYTES.byteLength,
          }
        : null,
  );

  async storeOriginal(): Promise<void> {}
  async storePage(): Promise<void> {}
  async storeThumbnail(): Promise<void> {}
  async openPage(): Promise<null> {
    return null;
  }
  async openThumbnail(): Promise<null> {
    return null;
  }
  async remove(): Promise<void> {}
}

function createUseCase() {
  const store = new InMemoryOriginals();
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
  const useCase = new DownloadClientResourceUseCase({
    resources: new InMemoryClientResources(),
    clients,
    store,
    incidents,
  });

  return { useCase, store, incidents };
}

describe("DownloadClientResourceUseCase", () => {
  it.each([
    ["the coach", { role: "COACH", authSubjectId: "user_eli" }],
    ["the client it is for", { role: "CLIENT", authSubjectId: "user_ana" }],
  ] as const)(
    "streams the unchanged original, named for its real format, to %s",
    async (_case, requester) => {
      // arrange
      const { useCase } = createUseCase();

      // act
      const result = await useCase.execute({
        requester,
        resourceId: "resource-1",
      });

      // assert
      expect(result).toMatchObject({
        status: "opened",
        sizeBytes: 4,
        downloadName: "Shopping list.xls",
        kind: "excel",
        mimeType: "application/vnd.ms-excel",
      });
      expect(
        result.status === "opened" ? await collect(result.bytes) : null,
      ).toEqual([...ORIGINAL_BYTES]);
    },
  );

  it("finds nothing for another client and reports the refusal", async () => {
    // arrange
    const { useCase, store, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "CLIENT", authSubjectId: "user_bea" },
      resourceId: "resource-1",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.openOriginal).not.toHaveBeenCalled();
    expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
      requesterRole: "CLIENT",
      clientId: "client-ana",
      resourceId: "resource-1",
    });
  });

  it("finds nothing for an unknown id", async () => {
    // arrange
    const { useCase, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: "resource-404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(incidents.resourceAccessRefused).not.toHaveBeenCalled();
  });

  it("finds nothing when the stored original is gone", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    store.openOriginal.mockResolvedValueOnce(null);

    // act
    const result = await useCase.execute({
      requester: { role: "COACH", authSubjectId: "user_eli" },
      resourceId: "resource-1",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
