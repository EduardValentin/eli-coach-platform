import { createHash } from "node:crypto";
import {
  chmod,
  mkdtemp,
  mkdir,
  rename,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import type { StoredFileDescriptor } from "@eli-coach-platform/domain";

import { Sha256FileDigest } from "./file-digest.server";
import { FilesystemFileStore } from "./filesystem-file-store.server";

describe("FilesystemFileStore", () => {
  it("verifies and streams an asset within the configured private root", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const contents = Buffer.from("a private guide");
    await mkdir(join(root, "guides"));
    await writeFile(join(root, "guides", "guide.pdf"), contents);
    const asset = describeFile({
      assetKey: "guides/guide.pdf",
      contents,
    });
    const store = new FilesystemFileStore(root);

    // act
    await store.assertReady();
    const streamed = await readStream(await store.openVerified(asset));

    // assert
    expect(streamed).toEqual(contents);
  });

  it("rejects traversal and absolute asset keys", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);

    // act
    const traversalOpen = store.openVerified(
      describeFile({
        assetKey: "../secret.txt",
        contents: Buffer.from("secret"),
      }),
    );
    const absoluteOpen = store.openVerified(
      describeFile({
        assetKey: join(root, "secret.txt"),
        contents: Buffer.from("secret"),
      }),
    );

    // assert
    await expect(traversalOpen).rejects.toThrow("Invalid asset key.");
    await expect(absoluteOpen).rejects.toThrow("Invalid asset key.");
  });

  it("returns false when file integrity no longer matches the published metadata", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const originalContents = Buffer.from("original guide");
    const asset = describeFile({
      assetKey: "guide.pdf",
      contents: originalContents,
    });
    await writeFile(join(root, "guide.pdf"), "changed guide");
    const store = new FilesystemFileStore(root);

    // act
    const verifiedOpen = store.openVerified(asset);

    // assert
    await expect(verifiedOpen).rejects.toThrow(
      "Stored file is unavailable.",
    );
  });

  it("streams the verified descriptor when the published path is replaced", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const outsideRoot = await mkdtemp(
      join(tmpdir(), "eli-file-store-outside-"),
    );
    const originalContents = Buffer.from("original private guide");
    const outsideContents = Buffer.from("outside private content");
    const assetPath = join(root, "guide.pdf");
    const archivedAssetPath = join(root, "guide-original.pdf");
    const outsidePath = join(outsideRoot, "outside.pdf");
    await writeFile(assetPath, originalContents);
    await writeFile(outsidePath, outsideContents);
    const asset = describeFile({
      assetKey: "guide.pdf",
      contents: originalContents,
    });
    const store = new FilesystemFileStore(root);
    const stream = await store.openVerified(asset);

    // act
    await rename(assetPath, archivedAssetPath);
    await symlink(outsidePath, assetPath);
    const streamed = await readStream(stream);
    const replacementOpen = store.openVerified(asset);

    // assert
    expect(streamed).toEqual(originalContents);
    await expect(replacementOpen).rejects.toThrow(
      "Invalid asset key.",
    );
  });

  it("fails readiness when the configured root does not exist", async () => {
    // arrange
    const root = join(
      await mkdtemp(join(tmpdir(), "eli-file-store-parent-")),
      "missing",
    );
    const store = new FilesystemFileStore(root);

    // act
    const readiness = store.assertReady();

    // assert
    await expect(readiness).rejects.toThrow(
      "Asset root is not ready.",
    );
  });

  // Root bypasses permission bits, so a 0o500 root stays writable and this
  // scenario cannot fail where tests run as root (Claude web sandboxes).
  const itUnlessRoot = it.skipIf(process.getuid?.() === 0);

  itUnlessRoot("fails readiness when the configured root is not writable", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    await chmod(root, 0o500);
    const store = new FilesystemFileStore(root);

    // act
    const synchronousReadiness = () => store.assertReadyAtStartup();
    const asynchronousReadiness = store.assertReady();

    // assert
    expect(synchronousReadiness).toThrow("Asset root is not ready.");
    await expect(asynchronousReadiness).rejects.toThrow(
      "Asset root is not ready.",
    );
    await chmod(root, 0o700);
  });
});

describe("FilesystemFileStore.write", () => {
  it("creates the key's directories and streams the bytes back verified", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    const contents = Buffer.from("a freshly published guide");

    // act
    await store.write({
      assetKey: "products/published.pdf",
      bytes: new Uint8Array(contents),
    });
    const streamed = await readStream(
      await store.openVerified(
        describeFile({ assetKey: "products/published.pdf", contents }),
      ),
    );

    // assert
    expect(streamed).toEqual(contents);
  });

  it("treats rewriting identical content as success, since keys are content-addressed", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    const bytes = new Uint8Array(Buffer.from("republished bytes"));

    // act
    await store.write({ assetKey: "products/same.pdf", bytes });
    const rewrite = store.write({ assetKey: "products/same.pdf", bytes });

    // assert
    await expect(rewrite).resolves.toBeUndefined();
  });

  it("refuses to overwrite a key whose existing bytes differ", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);

    // act
    await store.write({
      assetKey: "products/collision.pdf",
      bytes: new Uint8Array(Buffer.from("original")),
    });
    const conflicting = store.write({
      assetKey: "products/collision.pdf",
      bytes: new Uint8Array(Buffer.from("different")),
    });

    // assert
    await expect(conflicting).rejects.toThrow("Stored file is unavailable.");
  });

  it.each([
    ["a traversal key", "../escaped.pdf"],
    ["a nested traversal key", "products/../../escaped.pdf"],
  ])("rejects %s", async (_description, assetKey) => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);

    // act
    const escaping = store.write({
      assetKey,
      bytes: new Uint8Array(Buffer.from("escaped")),
    });

    // assert
    await expect(escaping).rejects.toThrow("Invalid asset key.");
  });

  it("rejects an absolute key", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);

    // act
    const escaping = store.write({
      assetKey: join(root, "absolute.pdf"),
      bytes: new Uint8Array(Buffer.from("escaped")),
    });

    // assert
    await expect(escaping).rejects.toThrow("Invalid asset key.");
  });

  it("refuses to write through a symlinked directory segment", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const outside = await mkdtemp(join(tmpdir(), "eli-file-store-outside-"));
    const store = new FilesystemFileStore(root);

    // A directory-level link is followed by `mkdir -p`, so the leaf-only
    // `wx` guard never sees it.
    await symlink(outside, join(root, "products"));

    // act
    const throughDirectorySymlink = store.write({
      assetKey: "products/escaped.pdf",
      bytes: new Uint8Array(Buffer.from("escaped")),
    });

    // assert
    await expect(throughDirectorySymlink).rejects.toThrow(
      "Invalid asset key.",
    );
    await expect(
      stat(join(outside, "escaped.pdf")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses to write through a symlink planted at the key", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const outside = await mkdtemp(join(tmpdir(), "eli-file-store-outside-"));
    const store = new FilesystemFileStore(root);

    await mkdir(join(root, "products"), { recursive: true });
    await writeFile(join(outside, "target.pdf"), "pre-existing");
    await symlink(join(outside, "target.pdf"), join(root, "products", "linked.pdf"));

    // act
    const throughSymlink = store.write({
      assetKey: "products/linked.pdf",
      bytes: new Uint8Array(Buffer.from("planted")),
    });

    // assert
    await expect(throughSymlink).rejects.toThrow(
      "Stored file is unavailable.",
    );
  });
});

function describeFile(options: {
  assetKey: string;
  contents: Buffer;
}): StoredFileDescriptor {
  return {
    assetKey: options.assetKey,
    sha256: createHash("sha256").update(options.contents).digest("hex"),
    sizeBytes: options.contents.byteLength,
  };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

describe("FilesystemFileStore.open", () => {
  it("streams the whole file when no range is asked for", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    const contents = Buffer.from("0123456789");
    await store.write({
      assetKey: "exercise-videos/demo.mp4",
      bytes: new Uint8Array(contents),
    });

    // act
    const streamed = await readStream(
      await store.open(
        describeFile({ assetKey: "exercise-videos/demo.mp4", contents }),
      ),
    );

    // assert
    expect(streamed).toEqual(contents);
  });

  it("streams only the inclusive byte range asked for", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    const contents = Buffer.from("0123456789");
    await store.write({
      assetKey: "exercise-videos/demo.mp4",
      bytes: new Uint8Array(contents),
    });

    // act
    const streamed = await readStream(
      await store.open(
        describeFile({ assetKey: "exercise-videos/demo.mp4", contents }),
        { end: 5, start: 2 },
      ),
    );

    // assert
    expect(streamed.toString()).toBe("2345");
  });

  it("rejects a range that reaches past the file", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    const contents = Buffer.from("0123456789");
    await store.write({
      assetKey: "exercise-videos/demo.mp4",
      bytes: new Uint8Array(contents),
    });

    // act
    const beyond = store.open(
      describeFile({ assetKey: "exercise-videos/demo.mp4", contents }),
      { end: 10, start: 8 },
    );

    // assert
    await expect(beyond).rejects.toThrow("Invalid byte range.");
  });

  it("refuses a file whose size no longer matches the descriptor", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-file-store-"));
    const store = new FilesystemFileStore(root);
    await store.write({
      assetKey: "exercise-videos/demo.mp4",
      bytes: new Uint8Array(Buffer.from("0123456789")),
    });

    // act
    const mismatched = store.open({
      assetKey: "exercise-videos/demo.mp4",
      sha256: "a".repeat(64),
      sizeBytes: 4,
    });

    // assert
    await expect(mismatched).rejects.toThrow("Stored file is unavailable.");
  });
});

describe("Sha256FileDigest", () => {
  it("digests bytes as lowercase hex", () => {
    // arrange
    const digest = new Sha256FileDigest();

    // act
    const hex = digest.sha256(new Uint8Array(Buffer.from("abc")));

    // assert
    expect(hex).toBe(createHash("sha256").update("abc").digest("hex"));
  });
});
