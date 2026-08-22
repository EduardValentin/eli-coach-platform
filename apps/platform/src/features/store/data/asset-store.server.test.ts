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

import type { ProductAsset } from "@eli-coach-platform/domain";

import { FilesystemProductAssetStore } from "./asset-store.server";

describe("FilesystemProductAssetStore", () => {
  it("verifies and streams an asset within the configured private root", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const contents = Buffer.from("a private guide");
    await mkdir(join(root, "guides"));
    await writeFile(join(root, "guides", "guide.pdf"), contents);
    const asset = createAsset({
      assetKey: "guides/guide.pdf",
      contents,
    });
    const store = new FilesystemProductAssetStore(root);

    // act
    await store.assertReady();
    const streamed = await readStream(await store.openVerified(asset));

    // assert
    expect(streamed).toEqual(contents);
  });

  it("rejects traversal and absolute asset keys", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);

    // act
    const traversalOpen = store.openVerified(
      createAsset({
        assetKey: "../secret.txt",
        contents: Buffer.from("secret"),
      }),
    );
    const absoluteOpen = store.openVerified(
      createAsset({
        assetKey: join(root, "secret.txt"),
        contents: Buffer.from("secret"),
      }),
    );

    // assert
    await expect(traversalOpen).rejects.toThrow("Invalid product asset key.");
    await expect(absoluteOpen).rejects.toThrow("Invalid product asset key.");
  });

  it("returns false when file integrity no longer matches the published metadata", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const originalContents = Buffer.from("original guide");
    const asset = createAsset({
      assetKey: "guide.pdf",
      contents: originalContents,
    });
    await writeFile(join(root, "guide.pdf"), "changed guide");
    const store = new FilesystemProductAssetStore(root);

    // act
    const verifiedOpen = store.openVerified(asset);

    // assert
    await expect(verifiedOpen).rejects.toThrow(
      "Product asset is unavailable.",
    );
  });

  it("streams the verified descriptor when the published path is replaced", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const outsideRoot = await mkdtemp(
      join(tmpdir(), "eli-store-assets-outside-"),
    );
    const originalContents = Buffer.from("original private guide");
    const outsideContents = Buffer.from("outside private content");
    const assetPath = join(root, "guide.pdf");
    const archivedAssetPath = join(root, "guide-original.pdf");
    const outsidePath = join(outsideRoot, "outside.pdf");
    await writeFile(assetPath, originalContents);
    await writeFile(outsidePath, outsideContents);
    const asset = createAsset({
      assetKey: "guide.pdf",
      contents: originalContents,
    });
    const store = new FilesystemProductAssetStore(root);
    const stream = await store.openVerified(asset);

    // act
    await rename(assetPath, archivedAssetPath);
    await symlink(outsidePath, assetPath);
    const streamed = await readStream(stream);
    const replacementOpen = store.openVerified(asset);

    // assert
    expect(streamed).toEqual(originalContents);
    await expect(replacementOpen).rejects.toThrow(
      "Invalid product asset key.",
    );
  });

  it("fails readiness when the configured root does not exist", async () => {
    // arrange
    const root = join(
      await mkdtemp(join(tmpdir(), "eli-store-assets-parent-")),
      "missing",
    );
    const store = new FilesystemProductAssetStore(root);

    // act
    const readiness = store.assertReady();

    // assert
    await expect(readiness).rejects.toThrow(
      "Store asset root is not ready.",
    );
  });

  // Root bypasses permission bits, so a 0o500 root stays writable and this
  // scenario cannot fail where tests run as root (Claude web sandboxes).
  const itUnlessRoot = it.skipIf(process.getuid?.() === 0);

  itUnlessRoot("fails readiness when the configured root is not writable", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    await chmod(root, 0o500);
    const store = new FilesystemProductAssetStore(root);

    // act
    const synchronousReadiness = () => store.assertReadyAtStartup();
    const asynchronousReadiness = store.assertReady();

    // assert
    expect(synchronousReadiness).toThrow("Store asset root is not ready.");
    await expect(asynchronousReadiness).rejects.toThrow(
      "Store asset root is not ready.",
    );
    await chmod(root, 0o700);
  });
});

describe("FilesystemProductAssetStore.write", () => {
  it("creates the key's directories and streams the bytes back verified", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);
    const contents = Buffer.from("a freshly published guide");

    // act
    await store.write({
      assetKey: "products/published.pdf",
      bytes: new Uint8Array(contents),
    });
    const streamed = await readStream(
      await store.openVerified(
        createAsset({ assetKey: "products/published.pdf", contents }),
      ),
    );

    // assert
    expect(streamed).toEqual(contents);
  });

  it("treats rewriting identical content as success, since keys are content-addressed", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);
    const bytes = new Uint8Array(Buffer.from("republished bytes"));

    // act
    await store.write({ assetKey: "products/same.pdf", bytes });
    const rewrite = store.write({ assetKey: "products/same.pdf", bytes });

    // assert
    await expect(rewrite).resolves.toBeUndefined();
  });

  it("refuses to overwrite a key whose existing bytes differ", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);

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
    await expect(conflicting).rejects.toThrow("Product asset is unavailable.");
  });

  it.each([
    ["a traversal key", "../escaped.pdf"],
    ["a nested traversal key", "products/../../escaped.pdf"],
  ])("rejects %s", async (_description, assetKey) => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);

    // act
    const escaping = store.write({
      assetKey,
      bytes: new Uint8Array(Buffer.from("escaped")),
    });

    // assert
    await expect(escaping).rejects.toThrow("Invalid product asset key.");
  });

  it("rejects an absolute key", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const store = new FilesystemProductAssetStore(root);

    // act
    const escaping = store.write({
      assetKey: join(root, "absolute.pdf"),
      bytes: new Uint8Array(Buffer.from("escaped")),
    });

    // assert
    await expect(escaping).rejects.toThrow("Invalid product asset key.");
  });

  it("refuses to write through a symlinked directory segment", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const outside = await mkdtemp(join(tmpdir(), "eli-store-outside-"));
    const store = new FilesystemProductAssetStore(root);

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
      "Invalid product asset key.",
    );
    await expect(
      stat(join(outside, "escaped.pdf")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses to write through a symlink planted at the key", async () => {
    // arrange
    const root = await mkdtemp(join(tmpdir(), "eli-store-assets-"));
    const outside = await mkdtemp(join(tmpdir(), "eli-store-outside-"));
    const store = new FilesystemProductAssetStore(root);

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
      "Product asset is unavailable.",
    );
  });
});

function createAsset(options: {
  assetKey: string;
  contents: Buffer;
}): ProductAsset {
  return {
    assetKey: options.assetKey,
    customerFilename: "guide.pdf",
    mimeType: "application/pdf",
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
