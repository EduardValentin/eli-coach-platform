import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";
import type {
  ClientAvatarStore,
  ProgressPhotoStore,
} from "@eli-coach-platform/domain/client-profile";

import {
  clientAvatarStorageKey,
  progressPhotoStorageKey,
} from "./client-media-layout.server";
import {
  EncryptedFilesystemClientMediaStore,
  type EncryptedFilesystemSettings,
} from "./encrypted-filesystem-client-media-store.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";
import { InMemoryClientMediaStore } from "./in-memory-client-media-store.server";

type FilesystemSettingName =
  "CLIENT_MEDIA_ROOT" | "CLIENT_MEDIA_KEY" | "CLIENT_MEDIA_KEY_ID";

export function createProgressPhotoStore(
  config: ClientFilesConfig,
): ProgressPhotoStore {
  return createClientMediaStore(config, progressPhotoStorageKey);
}

export function createClientAvatarStore(
  config: ClientFilesConfig,
): ClientAvatarStore {
  return createClientMediaStore(config, clientAvatarStorageKey);
}

function createClientMediaStore<Owner>(
  config: ClientFilesConfig,
  storageKeyOf: (owner: Owner) => string,
):
  EncryptedFilesystemClientMediaStore<Owner> | InMemoryClientMediaStore<Owner> {
  if (config.CLIENT_MEDIA_PROVIDER === "memory") {
    return new InMemoryClientMediaStore(storageKeyOf);
  }

  const settings = filesystemSettings(config);

  if (!isReadyMediaRoot(settings.root)) {
    throw new Error("Client media root is not ready.");
  }

  return new EncryptedFilesystemClientMediaStore(settings, storageKeyOf);
}

function filesystemSettings(
  config: ClientFilesConfig,
): EncryptedFilesystemSettings {
  return {
    root: requiredSetting(config, "CLIENT_MEDIA_ROOT"),
    key: Buffer.from(requiredSetting(config, "CLIENT_MEDIA_KEY"), "base64"),
    keyId: requiredSetting(config, "CLIENT_MEDIA_KEY_ID"),
  };
}

function requiredSetting(
  config: ClientFilesConfig,
  name: FilesystemSettingName,
): string {
  const value = config[name];

  if (value === undefined) {
    throw new Error(`Filesystem client media requires ${name}.`);
  }

  return value;
}
