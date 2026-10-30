import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRecipePhotoStoreAdapter } from "./create-recipe-photo-store-adapter.server";

const RUNS_AS_SUPERUSER = process.getuid?.() === 0;
const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";

describe("createRecipePhotoStore", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "recipe-photo-factory-"));
  });

  afterEach(async () => {
    await chmod(workspace, 0o700);
    await rm(workspace, { recursive: true, force: true });
  });

  it("returns a store over a ready root", async () => {
    // arrange
    const photo = Buffer.from([1, 2, 3]);

    // act
    const store = createRecipePhotoStoreAdapter(workspace);

    // assert
    await store.store(PHOTO_ID, photo);
    expect(await store.open(PHOTO_ID)).toMatchObject({
      status: "opened",
      sizeBytes: photo.length,
    });
  });

  it("refuses a root that does not exist", () => {
    // arrange
    const root = join(workspace, "missing");

    // act
    const create = () => createRecipePhotoStoreAdapter(root);

    // assert
    expect(create).toThrow("Recipe photo root is not ready.");
  });

  it("refuses a root that is a file", async () => {
    // arrange
    const file = join(workspace, "file");
    await writeFile(file, "not a directory");

    // act
    const create = () => createRecipePhotoStoreAdapter(file);

    // assert
    expect(create).toThrow("Recipe photo root is not ready.");
  });

  it.skipIf(RUNS_AS_SUPERUSER)(
    "refuses a root the process cannot write to",
    async () => {
      // arrange
      const readOnlyRoot = join(workspace, "read-only");
      await mkdir(readOnlyRoot, { mode: 0o500 });

      // act
      const create = () => createRecipePhotoStoreAdapter(readOnlyRoot);

      // assert
      expect(create).toThrow("Recipe photo root is not ready.");
    },
  );
});
