import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../shared";

import { AddClientResourceUseCase } from "./add-client-resource-use-case";
import type { ClientResource, ClientResourceOwner } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type {
  ClientResourceStore,
  ResourcePageImage,
} from "./client-resource-store";
import type { BrowsedResources, ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import type {
  ResourceDocumentPages,
  ResourceDocumentReading,
} from "./resource-document-pages";
import type {
  DetectedResourceFile,
  ResourceFileFormatDetector,
} from "./resource-file-format-detector";
import { MAX_RESOURCE_FILE_BYTES } from "./resource-file-intake";
import type {
  ResourceImagePages,
  ResourceImageRendering,
} from "./resource-image-pages";
import {
  MAX_RESOURCE_TAG_LENGTH,
  type ResourceTagSnapshot,
} from "./resource-tags";

const NOW = new Date("2026-10-05T09:00:00.000Z");
const COACH = { role: "COACH", authSubjectId: "user_eli" } as const;
const DETAILS = { title: " Meal plan ", description: "Week one", tags: [] };
const MEAL_PREP = { tag: "Meal Prep", folded: "meal prep" };
const OWNER = { clientId: "client-ana", resourceId: "resource-1" };

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

const PDF_BYTES = ascii("a three page meal plan");
const PNG_BYTES = ascii("a photo of a plate");
const DOCX_BYTES = ascii("a Word meal plan");
const XLSX_BYTES = ascii("an Excel shopping list");

const DETECTED_FILES = new Map<Uint8Array, DetectedResourceFile>([
  [PDF_BYTES, { type: "pdf", archiveEntries: [] }],
  [PNG_BYTES, { type: "png", archiveEntries: [] }],
  [
    DOCX_BYTES,
    {
      type: "docx",
      archiveEntries: ["[Content_Types].xml", "word/document.xml"],
    },
  ],
  [
    XLSX_BYTES,
    {
      type: "xlsx",
      archiveEntries: ["[Content_Types].xml", "xl/workbook.xml"],
    },
  ],
]);

const UNIDENTIFIED: DetectedResourceFile = { type: null, archiveEntries: [] };

class InTestFileFormats implements ResourceFileFormatDetector {
  readonly detect = vi.fn(
    async (bytes: Uint8Array) => DETECTED_FILES.get(bytes) ?? UNIDENTIFIED,
  );
}

class InMemoryClientResources implements ClientResources {
  readonly added: ClientResource[] = [];

  readonly add = vi.fn(async (resource: ClientResource) => {
    this.added.push(resource);
  });

  async recordOpened(): Promise<void> {}

  async saveDetails(): Promise<void> {}

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
    MEAL_PREP,
  ]);

  async findById(): Promise<ClientResource | null> {
    return null;
  }
}

class InMemoryResourceStore implements ClientResourceStore {
  readonly files = new Map<string, Uint8Array>();

  readonly storePage = vi.fn(
    async (owner: ClientResourceOwner, page: ResourcePageImage) => {
      this.files.set(this.key(owner, `page-${page.pageNumber}`), page.bytes);
    },
  );

  readonly remove = vi.fn(async (owner: ClientResourceOwner) => {
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(this.key(owner, ""))) this.files.delete(key);
    }
  });

  async storeOriginal(owner: ClientResourceOwner, bytes: Uint8Array) {
    this.files.set(this.key(owner, "original"), bytes);
  }

  async storeThumbnail(owner: ClientResourceOwner, bytes: Uint8Array) {
    this.files.set(this.key(owner, "thumbnail"), bytes);
  }

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
    return [...this.files.keys()];
  }

  private key(owner: ClientResourceOwner, name: string): string {
    return `${owner.clientId}/${owner.resourceId}/${name}`;
  }
}

class FakeDocumentPages implements ResourceDocumentPages {
  readonly received: Uint8Array[] = [];
  renderedPages = 0;
  closed = false;

  constructor(private readonly pageCount: number | "unreadable") {}

  async read(bytes: Uint8Array): Promise<ResourceDocumentReading> {
    this.received.push(bytes);
    if (this.pageCount === "unreadable") return { status: "unreadable" };

    const pageCount = this.pageCount;

    return {
      status: "readable",
      pageCount,
      pages: () => this.pages(pageCount),
      thumbnail: async () => Uint8Array.of(0),
      close: async () => {
        this.closed = true;
      },
    };
  }

  private async *pages(pageCount: number): AsyncIterable<ResourcePageImage> {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      this.renderedPages++;
      yield { pageNumber, bytes: Uint8Array.of(pageNumber) };
    }
  }
}

function imagePages(rendering: ResourceImageRendering): ResourceImagePages {
  return { render: vi.fn(async () => rendering) };
}

type Setup = {
  documentPages?: FakeDocumentPages;
  imagePages?: ResourceImagePages;
  clientExists?: boolean;
};

function createUseCase(setup: Setup = {}) {
  const resources = new InMemoryClientResources();
  const store = new InMemoryResourceStore();
  const documentPages = setup.documentPages ?? new FakeDocumentPages(3);
  const clients = {
    exists: vi.fn(async () => setup.clientExists ?? true),
    findByAuthSubjectId: vi.fn(async () => null),
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
  const clock: Clock = { now: () => NOW };
  const fileFormats = new InTestFileFormats();
  const useCase = new AddClientResourceUseCase({
    resources,
    resourceIds: { generate: () => "resource-1" },
    clients,
    store,
    documentPages,
    imagePages:
      setup.imagePages ??
      imagePages({
        status: "rendered",
        page: Uint8Array.of(1),
        thumbnail: Uint8Array.of(0),
      }),
    fileFormats,
    clock,
    incidents,
  });

  return { useCase, resources, store, documentPages, incidents, fileFormats };
}

function addCommand(file: { originalName: string; bytes: Uint8Array }) {
  return { requester: COACH, clientId: "client-ana", details: DETAILS, file };
}

describe("AddClientResourceUseCase", () => {
  it("keeps a PDF's original, every page and a thumbnail, then records it", async () => {
    // arrange
    const { useCase, resources, store, documentPages, incidents } =
      createUseCase();

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "Meal plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result.status).toBe("added");
    expect(resources.added.map((resource) => resource.toSnapshot())).toEqual([
      {
        id: "resource-1",
        clientId: "client-ana",
        title: "Meal plan",
        description: "Week one",
        tags: [],
        file: {
          originalName: "Meal plan.pdf",
          format: "pdf",
          sizeBytes: PDF_BYTES.byteLength,
          pageCount: 3,
        },
        addedAt: NOW,
        openedAt: null,
      },
    ]);
    expect(store.storedNames()).toEqual([
      "client-ana/resource-1/original",
      "client-ana/resource-1/page-1",
      "client-ana/resource-1/page-2",
      "client-ana/resource-1/page-3",
      "client-ana/resource-1/thumbnail",
    ]);
    expect(store.files.get("client-ana/resource-1/original")).toEqual(
      PDF_BYTES,
    );
    expect(documentPages.closed).toBe(true);
    expect(incidents.resourceStored).toHaveBeenCalledWith({
      clientId: "client-ana",
      resourceId: "resource-1",
      format: "pdf",
      sizeBytes: PDF_BYTES.byteLength,
      pageCount: 3,
    });
  });

  it("hands the page reader its own copy of the bytes and stores the original from the bytes it was given", async () => {
    // arrange
    const { useCase, store, documentPages } = createUseCase();

    // act
    await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(documentPages.received[0]).toEqual(PDF_BYTES);
    expect(documentPages.received[0]).not.toBe(PDF_BYTES);
    expect(documentPages.received[0].buffer).not.toBe(PDF_BYTES.buffer);
    expect(store.files.get("client-ana/resource-1/original")).toBe(PDF_BYTES);
  });

  it("accepts a PDF of exactly 50 pages", async () => {
    // arrange
    const { useCase, resources } = createUseCase({
      documentPages: new FakeDocumentPages(50),
    });

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result.status).toBe("added");
    expect(resources.added[0].toSnapshot().file.pageCount).toBe(50);
  });

  it("refuses a PDF of 51 pages before any page is rendered or stored", async () => {
    // arrange
    const documentPages = new FakeDocumentPages(51);
    const { useCase, store, resources, incidents } = createUseCase({
      documentPages,
    });

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "refused", refusal: "too-many-pages" });
    expect(documentPages.renderedPages).toBe(0);
    expect(documentPages.closed).toBe(true);
    expect(store.storedNames()).toEqual([]);
    expect(resources.added).toEqual([]);
    expect(incidents.resourceRefused).toHaveBeenCalledWith({
      clientId: "client-ana",
      receivedBytes: PDF_BYTES.byteLength,
      reason: "too-many-pages",
    });
  });

  it("refuses a PDF that cannot be read", async () => {
    // arrange
    const { useCase, store, resources } = createUseCase({
      documentPages: new FakeDocumentPages("unreadable"),
    });

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "locked.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "refused", refusal: "unreadable" });
    expect(store.storedNames()).toEqual([]);
    expect(resources.added).toEqual([]);
  });

  it("keeps an image's original, its single page and a thumbnail", async () => {
    // arrange
    const { useCase, store, resources } = createUseCase();

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "Plate.png", bytes: PNG_BYTES }),
    );

    // assert
    expect(result.status).toBe("added");
    expect(resources.added[0].toSnapshot().file).toEqual({
      originalName: "Plate.png",
      format: "png",
      sizeBytes: PNG_BYTES.byteLength,
      pageCount: 1,
    });
    expect(store.storedNames()).toEqual([
      "client-ana/resource-1/original",
      "client-ana/resource-1/page-1",
      "client-ana/resource-1/thumbnail",
    ]);
  });

  it("refuses an image the renderer will not decode as an unsupported type", async () => {
    // arrange
    const { useCase, store } = createUseCase({
      imagePages: imagePages({ status: "refused" }),
    });

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "Plate.png", bytes: PNG_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "refused", refusal: "unsupported-type" });
    expect(store.storedNames()).toEqual([]);
  });

  it.each([
    {
      file: "a Word file",
      originalName: "Plan.docx",
      bytes: DOCX_BYTES,
      format: "docx",
    },
    {
      file: "an Excel file",
      originalName: "Shopping.xlsx",
      bytes: XLSX_BYTES,
      format: "xlsx",
    },
  ])(
    "keeps only the original of $file",
    async ({ originalName, bytes, format }) => {
      // arrange
      const { useCase, store, resources, documentPages } = createUseCase();

      // act
      const result = await useCase.execute(addCommand({ originalName, bytes }));

      // assert
      expect(result.status).toBe("added");
      expect(resources.added[0].toSnapshot().file).toEqual({
        originalName,
        format,
        sizeBytes: bytes.byteLength,
        pageCount: null,
      });
      expect(store.storedNames()).toEqual(["client-ana/resource-1/original"]);
      expect(documentPages.received).toEqual([]);
    },
  );

  it.each([
    {
      file: "a PDF named as a Word file",
      originalName: "plan.docx",
      bytes: PDF_BYTES,
      format: "pdf",
    },
    {
      file: "an image named as a PDF",
      originalName: "plate.pdf",
      bytes: PNG_BYTES,
      format: "png",
    },
    {
      file: "a Word file named as an Excel file",
      originalName: "plan.xlsx",
      bytes: DOCX_BYTES,
      format: "docx",
    },
    {
      file: "an Excel file named as an image",
      originalName: "sheet.png",
      bytes: XLSX_BYTES,
      format: "xlsx",
    },
  ])(
    "judges $file by its bytes and keeps the name it came with",
    async ({ originalName, bytes, format }) => {
      // arrange
      const { useCase, resources } = createUseCase();

      // act
      await useCase.execute(addCommand({ originalName, bytes }));

      // assert
      expect(resources.added[0].toSnapshot().file).toMatchObject({
        originalName,
        format,
      });
    },
  );

  it("refuses bytes of no accepted type, whatever the file is called", async () => {
    // arrange
    const { useCase, store, incidents } = createUseCase();
    const bytes = ascii("MZ this is an executable");

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes }),
    );

    // assert
    expect(result).toEqual({ status: "refused", refusal: "unsupported-type" });
    expect(store.storedNames()).toEqual([]);
    expect(incidents.resourceRefused).toHaveBeenCalledWith({
      clientId: "client-ana",
      receivedBytes: bytes.byteLength,
      reason: "unsupported-type",
    });
  });

  it("refuses a file over 25 MB before detecting its format", async () => {
    // arrange
    const { useCase, documentPages, fileFormats } = createUseCase();
    const bytes = new Uint8Array(MAX_RESOURCE_FILE_BYTES + 1);

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "big.pdf", bytes }),
    );

    // assert
    expect(result).toEqual({ status: "refused", refusal: "too-large" });
    expect(fileFormats.detect).not.toHaveBeenCalled();
    expect(documentPages.received).toEqual([]);
  });

  it("names each problem with the details and keeps nothing", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ...addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
      details: { title: "  ", description: "", tags: [] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid-details",
      problems: { title: "missing" },
    });
    expect(store.storedNames()).toEqual([]);
  });

  it("tags the resource in the spelling the coach already uses and keeps a new tag as typed", async () => {
    // arrange
    const { useCase, resources } = createUseCase();

    // act
    const result = await useCase.execute({
      ...addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
      details: { ...DETAILS, tags: ["MEAL  prep", " Recovery ", "meal prep"] },
    });

    // assert
    expect(result.status).toBe("added");
    expect(resources.added[0].toSnapshot().tags).toEqual([
      MEAL_PREP,
      { tag: "Recovery", folded: "recovery" },
    ]);
  });

  it("names a tag that is too long with the details' problems, reading nothing and keeping nothing", async () => {
    // arrange
    const { useCase, resources, store, fileFormats } = createUseCase();

    // act
    const result = await useCase.execute({
      ...addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
      details: {
        title: "",
        description: "",
        tags: ["t".repeat(MAX_RESOURCE_TAG_LENGTH + 1)],
      },
    });

    // assert
    expect(result).toEqual({
      status: "invalid-details",
      problems: { title: "missing", tags: "too-long" },
    });
    expect(fileFormats.detect).not.toHaveBeenCalled();
    expect(resources.tagVocabulary).not.toHaveBeenCalled();
    expect(store.storedNames()).toEqual([]);
  });

  it("removes the stored files when the tag vocabulary cannot be read, reporting why", async () => {
    // arrange
    const { useCase, resources, store, incidents } = createUseCase();
    const failure = new Error("database down");
    resources.tagVocabulary.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.storedNames()).toEqual([]);
    expect(resources.added).toEqual([]);
    expect(incidents.resourceStorageFailed).toHaveBeenCalledWith({
      ...OWNER,
      error: failure,
    });
  });

  it("finds no client who does not exist", async () => {
    // arrange
    const { useCase, store } = createUseCase({ clientExists: false });

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.storedNames()).toEqual([]);
  });

  it("lets only the coach add a resource, reporting anyone else", async () => {
    // arrange
    const { useCase, store, incidents } = createUseCase();

    // act
    const result = await useCase.execute({
      ...addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.storedNames()).toEqual([]);
    expect(incidents.resourceAccessRefused).toHaveBeenCalledWith({
      requesterRole: "CLIENT",
      clientId: "client-ana",
      resourceId: null,
    });
  });

  it("removes the stored files when the record cannot be written, reporting why", async () => {
    // arrange
    const { useCase, resources, store, incidents } = createUseCase();
    const failure = new Error("database down");
    resources.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.remove).toHaveBeenCalledWith(OWNER);
    expect(store.storedNames()).toEqual([]);
    expect(incidents.resourceStorageFailed).toHaveBeenCalledWith({
      ...OWNER,
      error: failure,
    });
    expect(incidents.resourceStored).not.toHaveBeenCalled();
  });

  it("removes the stored files and closes the document when a page cannot be stored", async () => {
    // arrange
    const { useCase, resources, store, documentPages } = createUseCase();
    store.storePage.mockRejectedValueOnce(new Error("disk full"));

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(store.storedNames()).toEqual([]);
    expect(documentPages.closed).toBe(true);
    expect(resources.added).toEqual([]);
  });

  it("fails without throwing when the cleanup fails too", async () => {
    // arrange
    const { useCase, resources, store, incidents } = createUseCase();
    resources.add.mockRejectedValueOnce(new Error("database down"));
    store.remove.mockRejectedValueOnce(new Error("disk gone"));

    // act
    const result = await useCase.execute(
      addCommand({ originalName: "plan.pdf", bytes: PDF_BYTES }),
    );

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.resourceStorageFailed).toHaveBeenCalledWith({
      ...OWNER,
      error: new Error("database down"),
    });
  });
});
