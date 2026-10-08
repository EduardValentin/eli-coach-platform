import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createClientResourceStore } from "./create-client-resource-store.server";

const OWNER = { clientId: "client-1", resourceId: "resource-1" };
const RUNS_AS_SUPERUSER = process.getuid?.() === 0;

describe("createClientResourceStore", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "client-resource-factory-"));
  });

  afterEach(async () => {
    await chmod(workspace, 0o700);
    await rm(workspace, { recursive: true, force: true });
  });

  it("returns a store over a ready root", async () => {
    // arrange
    const thumbnail = Buffer.from([1, 2, 3]);

    // act
    const store = createClientResourceStore(workspace);

    // assert
    await store.storeThumbnail(OWNER, thumbnail);
    expect(await store.openThumbnail(OWNER)).toEqual(thumbnail);
  });

  it("refuses a root that does not exist", () => {
    // arrange
    const root = join(workspace, "missing");

    // act
    const create = () => createClientResourceStore(root);

    // assert
    expect(create).toThrow("Client resource root is not ready.");
  });

  it("refuses a root that is a file", async () => {
    // arrange
    const file = join(workspace, "file");
    await writeFile(file, "not a directory");

    // act
    const create = () => createClientResourceStore(file);

    // assert
    expect(create).toThrow("Client resource root is not ready.");
  });

  it.skipIf(RUNS_AS_SUPERUSER)(
    "refuses a root the process cannot write to",
    async () => {
      // arrange
      const readOnlyRoot = join(workspace, "read-only");
      await mkdir(readOnlyRoot, { mode: 0o500 });

      // act
      const create = () => createClientResourceStore(readOnlyRoot);

      // assert
      expect(create).toThrow("Client resource root is not ready.");
    },
  );
});
