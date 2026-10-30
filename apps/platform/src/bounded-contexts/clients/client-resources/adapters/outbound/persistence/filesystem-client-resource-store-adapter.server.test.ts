import { randomBytes } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ClientResourceOwner } from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilesystemClientResourceStoreAdapter } from "./filesystem-client-resource-store-adapter.server";

const openedFiles = vi.hoisted((): FileHandle[] => []);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const file = await actual.open(...args);
      openedFiles.push(file);

      return file;
    },
  };
});

const CLOSED_DESCRIPTOR = -1;
const OWNER = { clientId: "client-1", resourceId: "resource-1" };
const ORIGINAL = randomBytes(256 * 1024);
const PAGE_ONE = Buffer.from("page one image");
const PAGE_TWO = Buffer.from("page two image");
const THUMBNAIL = Buffer.from("thumbnail image");
const LOCATION_LEAVES_ROOT =
  "Client resource location leaves the storage root.";
const HOSTILE_OWNERS: ClientResourceOwner[] = [
  { clientId: "..", resourceId: "resource-1" },
  { clientId: "client-1", resourceId: ".." },
  { clientId: "client-1", resourceId: "a/b" },
  { clientId: "", resourceId: "resource-1" },
  { clientId: "client-1", resourceId: "" },
];

async function readAll(bytes: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of bytes) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function everyOpenedFileIsClosed(): boolean {
  return openedFiles.every((file) => file.fd === CLOSED_DESCRIPTOR);
}

describe("FilesystemClientResourceStoreAdapter", () => {
  let workspace: string;
  let root: string;
  let filesystemClientResourceStoreAdapter: FilesystemClientResourceStoreAdapter;

  beforeEach(async () => {
    openedFiles.length = 0;
    workspace = await mkdtemp(join(tmpdir(), "client-resource-store-"));
    root = join(workspace, "resources");
    await mkdir(root);
    filesystemClientResourceStoreAdapter =
      new FilesystemClientResourceStoreAdapter(root);
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  async function storeEverything(owner: ClientResourceOwner): Promise<void> {
    await filesystemClientResourceStoreAdapter.storeOriginal(owner, ORIGINAL);
    await filesystemClientResourceStoreAdapter.storePage(owner, {
      pageNumber: 1,
      bytes: PAGE_ONE,
    });
    await filesystemClientResourceStoreAdapter.storePage(owner, {
      pageNumber: 2,
      bytes: PAGE_TWO,
    });
    await filesystemClientResourceStoreAdapter.storeThumbnail(owner, THUMBNAIL);
  }

  it("opens the original, each page and the thumbnail it stored, as plain files under the owner's folder", async () => {
    // arrange
    await storeEverything(OWNER);

    // act
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);
    const pages = [
      await filesystemClientResourceStoreAdapter.openPage(OWNER, 1),
      await filesystemClientResourceStoreAdapter.openPage(OWNER, 2),
    ];
    const thumbnail =
      await filesystemClientResourceStoreAdapter.openThumbnail(OWNER);

    // assert
    expect(original?.sizeBytes).toBe(ORIGINAL.length);
    expect(await readAll(original!.bytes)).toEqual(ORIGINAL);
    expect(pages).toEqual([PAGE_ONE, PAGE_TWO]);
    expect(thumbnail).toEqual(THUMBNAIL);
    expect((await readdir(join(root, "client-1/resource-1"))).sort()).toEqual([
      "original",
      "page-1",
      "page-2",
      "thumbnail",
    ]);
    expect(await readFile(join(root, "client-1/resource-1/original"))).toEqual(
      ORIGINAL,
    );
  });

  it("streams the original in more than one chunk", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);

    // act
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);

    // assert
    let chunkCount = 0;
    for await (const _chunk of original!.bytes) {
      chunkCount += 1;
    }
    expect(chunkCount).toBeGreaterThan(1);
  });

  it("opens nothing for a resource with no files behind it", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);
    const unknown = { clientId: "client-1", resourceId: "resource-2" };

    // act
    const opened = [
      await filesystemClientResourceStoreAdapter.openOriginal(unknown),
      await filesystemClientResourceStoreAdapter.openPage(unknown, 1),
      await filesystemClientResourceStoreAdapter.openThumbnail(unknown),
      await filesystemClientResourceStoreAdapter.openPage(OWNER, 1),
      await filesystemClientResourceStoreAdapter.openThumbnail(OWNER),
    ];

    // assert
    expect(opened).toEqual([null, null, null, null, null]);
  });

  it("closes every file it opens once the files are written and read through", async () => {
    // arrange
    await storeEverything(OWNER);

    // act
    await readAll(
      (await filesystemClientResourceStoreAdapter.openOriginal(OWNER))!.bytes,
    );
    await filesystemClientResourceStoreAdapter.openPage(OWNER, 1);
    await filesystemClientResourceStoreAdapter.openThumbnail(OWNER);

    // assert
    expect(openedFiles.length).toBeGreaterThan(0);
    expect(everyOpenedFileIsClosed()).toBe(true);
  });

  it("opens the original's file only once its bytes are first pulled", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);
    openedFiles.length = 0;

    // act
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);
    const openedBeforePulling = openedFiles.length;
    const firstChunk = await original!.bytes[Symbol.asyncIterator]().next();

    // assert
    expect(original?.sizeBytes).toBe(ORIGINAL.length);
    expect(openedBeforePulling).toBe(0);
    expect(firstChunk.done).toBe(false);
    expect(openedFiles).toHaveLength(1);
  });

  it("leaves no file open when the original is opened and dropped unread", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);
    openedFiles.length = 0;

    // act
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);
    await original!.bytes[Symbol.asyncIterator]().return?.();

    // assert
    expect(original?.sizeBytes).toBe(ORIGINAL.length);
    expect(openedFiles).toEqual([]);
  });

  it("releases the original's file when the reader stops after the first chunk", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);

    // act
    for await (const _chunk of original!.bytes) {
      break;
    }

    // assert
    expect(everyOpenedFileIsClosed()).toBe(true);
  });

  it("releases the original's file when the reader gives up before reading", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);
    const original =
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER);

    // act
    await original!.bytes[Symbol.asyncIterator]().return?.();

    // assert
    expect(everyOpenedFileIsClosed()).toBe(true);
  });

  it("refuses to overwrite an original already stored for the owner, rejecting so the upload fails", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL);

    // act
    const storing = filesystemClientResourceStoreAdapter.storeOriginal(
      OWNER,
      new Uint8Array([9]),
    );

    // assert
    await expect(storing).rejects.toThrow(
      "A client resource file is already stored at this location.",
    );
    expect(
      await readAll(
        (await filesystemClientResourceStoreAdapter.openOriginal(OWNER))!.bytes,
      ),
    ).toEqual(ORIGINAL);
  });

  it("refuses to overwrite a page already stored for the owner", async () => {
    // arrange
    await filesystemClientResourceStoreAdapter.storePage(OWNER, {
      pageNumber: 1,
      bytes: PAGE_ONE,
    });

    // act
    const storing = filesystemClientResourceStoreAdapter.storePage(OWNER, {
      pageNumber: 1,
      bytes: PAGE_TWO,
    });

    // assert
    await expect(storing).rejects.toThrow(
      "A client resource file is already stored at this location.",
    );
    expect(
      await filesystemClientResourceStoreAdapter.openPage(OWNER, 1),
    ).toEqual(PAGE_ONE);
  });

  it("removes every file of the resource and leaves the client's other resources alone", async () => {
    // arrange
    const sibling = { clientId: "client-1", resourceId: "resource-2" };
    await storeEverything(OWNER);
    await storeEverything(sibling);

    // act
    await filesystemClientResourceStoreAdapter.remove(OWNER);

    // assert
    expect(await readdir(join(root, "client-1"))).toEqual(["resource-2"]);
    expect(
      await filesystemClientResourceStoreAdapter.openOriginal(OWNER),
    ).toBeNull();
    expect(
      await filesystemClientResourceStoreAdapter.openPage(OWNER, 1),
    ).toBeNull();
    expect(
      await filesystemClientResourceStoreAdapter.openThumbnail(OWNER),
    ).toBeNull();
    expect(
      await filesystemClientResourceStoreAdapter.openThumbnail(sibling),
    ).toEqual(THUMBNAIL);
  });

  it("removes again, and removes what was never stored, without failing", async () => {
    // arrange
    await storeEverything(OWNER);
    const neverStored = { clientId: "client-2", resourceId: "resource-9" };

    // act
    await filesystemClientResourceStoreAdapter.remove(OWNER);
    await filesystemClientResourceStoreAdapter.remove(OWNER);
    await filesystemClientResourceStoreAdapter.remove(neverStored);

    // assert
    expect(await readdir(root)).toEqual(["client-1"]);
  });

  it.each(HOSTILE_OWNERS)(
    "refuses the owner %j before touching the disk",
    async (owner) => {
      // arrange
      const calls = [
        () =>
          filesystemClientResourceStoreAdapter.storeOriginal(owner, ORIGINAL),
        () =>
          filesystemClientResourceStoreAdapter.storePage(owner, {
            pageNumber: 1,
            bytes: PAGE_ONE,
          }),
        () =>
          filesystemClientResourceStoreAdapter.storeThumbnail(owner, THUMBNAIL),
        () => filesystemClientResourceStoreAdapter.openOriginal(owner),
        () => filesystemClientResourceStoreAdapter.openPage(owner, 1),
        () => filesystemClientResourceStoreAdapter.openThumbnail(owner),
        () => filesystemClientResourceStoreAdapter.remove(owner),
      ];

      // act
      const outcomes = await Promise.allSettled(calls.map((call) => call()));

      // assert
      for (const outcome of outcomes) {
        expect(outcome).toMatchObject({
          status: "rejected",
          reason: new Error("Invalid client resource owner."),
        });
      }
      expect(await readdir(workspace)).toEqual(["resources"]);
      expect(await readdir(root)).toEqual([]);
      expect(openedFiles).toEqual([]);
    },
  );

  it.each([0, -1, 1.5])(
    "refuses the page number %d before touching the disk",
    async (pageNumber) => {
      // arrange
      // act
      const storing = filesystemClientResourceStoreAdapter.storePage(OWNER, {
        pageNumber,
        bytes: PAGE_ONE,
      });
      const opening = filesystemClientResourceStoreAdapter.openPage(
        OWNER,
        pageNumber,
      );

      // assert
      await expect(storing).rejects.toThrow(
        "Invalid client resource page number.",
      );
      await expect(opening).rejects.toThrow(
        "Invalid client resource page number.",
      );
      expect(await readdir(root)).toEqual([]);
    },
  );

  describe("with the resource folder linked outside the storage root", () => {
    let outside: string;

    beforeEach(async () => {
      outside = join(workspace, "outside");
      await mkdir(outside);
      await writeFile(join(outside, "original"), ORIGINAL);
      await writeFile(join(outside, "page-1"), PAGE_ONE);
      await writeFile(join(outside, "thumbnail"), THUMBNAIL);
      await mkdir(join(root, "client-1"));
      await symlink(outside, join(root, "client-1/resource-1"));
    });

    it.each([
      [
        "the original",
        () =>
          filesystemClientResourceStoreAdapter.storeOriginal(OWNER, ORIGINAL),
      ],
      [
        "a page",
        () =>
          filesystemClientResourceStoreAdapter.storePage(OWNER, {
            pageNumber: 2,
            bytes: PAGE_TWO,
          }),
      ],
      [
        "the thumbnail",
        () =>
          filesystemClientResourceStoreAdapter.storeThumbnail(OWNER, THUMBNAIL),
      ],
    ])("refuses to store %s through it", async (_file, storing) => {
      // arrange
      // act
      const outcome = storing();

      // assert
      await expect(outcome).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect((await readdir(outside)).sort()).toEqual([
        "original",
        "page-1",
        "thumbnail",
      ]);
    });

    it.each([
      [
        "the original",
        () => filesystemClientResourceStoreAdapter.openOriginal(OWNER),
      ],
      ["a page", () => filesystemClientResourceStoreAdapter.openPage(OWNER, 1)],
      [
        "the thumbnail",
        () => filesystemClientResourceStoreAdapter.openThumbnail(OWNER),
      ],
    ])("refuses to open %s through it", async (_file, opening) => {
      // arrange
      // act
      const outcome = opening();

      // assert
      await expect(outcome).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to remove through it and leaves the linked folder's files", async () => {
      // arrange
      // act
      const removing = filesystemClientResourceStoreAdapter.remove(OWNER);

      // assert
      await expect(removing).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect((await readdir(outside)).sort()).toEqual([
        "original",
        "page-1",
        "thumbnail",
      ]);
    });
  });

  it("refuses to store through a client folder linked outside the storage root", async () => {
    // arrange
    const outside = join(workspace, "outside");
    await mkdir(outside);
    await symlink(outside, join(root, "client-1"));

    // act
    const storing = filesystemClientResourceStoreAdapter.storeOriginal(
      OWNER,
      ORIGINAL,
    );

    // assert
    await expect(storing).rejects.toThrow(LOCATION_LEAVES_ROOT);
    expect(await readdir(outside)).toEqual([]);
  });

  it("refuses to open an original linked from outside the storage root", async () => {
    // arrange
    const outsideFile = join(workspace, "outside-original");
    await writeFile(outsideFile, ORIGINAL);
    await mkdir(join(root, "client-1/resource-1"), { recursive: true });
    await symlink(outsideFile, join(root, "client-1/resource-1/original"));

    // act
    const opening = filesystemClientResourceStoreAdapter.openOriginal(OWNER);

    // assert
    await expect(opening).rejects.toThrow(LOCATION_LEAVES_ROOT);
  });
});
