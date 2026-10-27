import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createClientAvatarStore,
  createProgressPhotoStore,
} from "./create-client-media-stores.server";
import { EncryptedFilesystemClientMediaStore } from "./filesystem/encrypted-filesystem-client-media-store.server";
import { InMemoryClientMediaStore } from "./memory/in-memory-client-media-store.server";

const KEY = "q83vEjRWeJCrze8SNFZ4kKvN7xI0VniQq83vEjRWeJA=";
const RESOURCE_ROOT = "/srv/client-resources";
const OWNER = { clientId: "client-1", entryId: "entry-1", photoId: "photo-1" };
const RUNS_AS_SUPERUSER = process.getuid?.() === 0;

describe("client media stores", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "client-media-factory-"));
  });

  afterEach(async () => {
    await chmod(workspace, 0o700);
    await rm(workspace, { recursive: true, force: true });
  });

  function filesystemConfig(root: string): ClientFilesConfig {
    return {
      CLIENT_MEDIA_PROVIDER: "filesystem",
      CLIENT_MEDIA_ROOT: root,
      CLIENT_MEDIA_KEY: KEY,
      CLIENT_MEDIA_KEY_ID: "unit-1",
      CLIENT_RESOURCE_ROOT: RESOURCE_ROOT,
    };
  }

  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config: ClientFilesConfig = {
      CLIENT_MEDIA_PROVIDER: "memory",
      CLIENT_RESOURCE_ROOT: RESOURCE_ROOT,
    };

    // act
    const store = createProgressPhotoStore(config);

    // assert
    expect(store).toBeInstanceOf(InMemoryClientMediaStore);
  });

  it("returns the encrypted filesystem store over a ready root, stamping the configured key id", async () => {
    // arrange
    const config = filesystemConfig(workspace);

    // act
    const store = createProgressPhotoStore(config);

    // assert
    expect(store).toBeInstanceOf(EncryptedFilesystemClientMediaStore);
    expect(await store.store(OWNER, new Uint8Array([1]))).toEqual({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: "unit-1",
    });
  });

  it("refuses a root that does not exist", () => {
    // arrange
    const config = filesystemConfig(join(workspace, "missing"));

    // act
    const create = () => createProgressPhotoStore(config);

    // assert
    expect(create).toThrow("Client media root is not ready.");
  });

  it("refuses a root that is a file", async () => {
    // arrange
    const file = join(workspace, "file");
    await writeFile(file, "not a directory");

    // act
    const create = () => createProgressPhotoStore(filesystemConfig(file));

    // assert
    expect(create).toThrow("Client media root is not ready.");
  });

  it.skipIf(RUNS_AS_SUPERUSER)(
    "refuses a root the process cannot write to",
    async () => {
      // arrange
      const readOnlyRoot = join(workspace, "read-only");
      await mkdir(readOnlyRoot, { mode: 0o500 });

      // act
      const create = () =>
        createProgressPhotoStore(filesystemConfig(readOnlyRoot));

      // assert
      expect(create).toThrow("Client media root is not ready.");
    },
  );

  it.each(["CLIENT_MEDIA_ROOT", "CLIENT_MEDIA_KEY", "CLIENT_MEDIA_KEY_ID"])(
    "refuses the filesystem provider without %s",
    (name) => {
      // arrange
      const config = { ...filesystemConfig(workspace), [name]: undefined };

      // act
      const create = () => createProgressPhotoStore(config);

      // assert
      expect(create).toThrow(`Filesystem client media requires ${name}.`);
    },
  );

  it("returns the avatar store over the same root and key, under her avatar folder", async () => {
    // arrange
    const config = filesystemConfig(workspace);

    // act
    const store = createClientAvatarStore(config);

    // assert
    expect(store).toBeInstanceOf(EncryptedFilesystemClientMediaStore);
    expect(
      await store.store(
        { clientId: "client-1", avatarId: "avatar-1" },
        new Uint8Array([1]),
      ),
    ).toEqual({ storageKey: "client-1/avatar/avatar-1.bin", keyId: "unit-1" });
  });

  it("returns the in-memory avatar double for the memory provider", () => {
    // arrange
    const config: ClientFilesConfig = {
      CLIENT_MEDIA_PROVIDER: "memory",
      CLIENT_RESOURCE_ROOT: RESOURCE_ROOT,
    };

    // act
    const store = createClientAvatarStore(config);

    // assert
    expect(store).toBeInstanceOf(InMemoryClientMediaStore);
  });
});
