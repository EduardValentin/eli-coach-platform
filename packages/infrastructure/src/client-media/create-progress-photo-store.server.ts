import type { ClientMediaConfig } from "@eli-coach-platform/config";
import type { ProgressPhotoStore } from "@eli-coach-platform/domain/client-profile";

import {
  EncryptedFilesystemProgressPhotoStore,
  type EncryptedFilesystemSettings,
} from "./filesystem/encrypted-filesystem-progress-photo-store.server";
import { isReadyMediaRoot } from "./filesystem/media-root.server";
import { InMemoryProgressPhotoStore } from "./memory/in-memory-progress-photo-store.server";

type FilesystemSettingName =
  "CLIENT_MEDIA_ROOT" | "CLIENT_MEDIA_KEY" | "CLIENT_MEDIA_KEY_ID";

export function createProgressPhotoStore(
  config: ClientMediaConfig,
): ProgressPhotoStore {
  if (config.CLIENT_MEDIA_PROVIDER === "memory") {
    return new InMemoryProgressPhotoStore();
  }

  const settings = filesystemSettings(config);

  if (!isReadyMediaRoot(settings.root)) {
    throw new Error("Client media root is not ready.");
  }

  return new EncryptedFilesystemProgressPhotoStore(settings);
}

function filesystemSettings(
  config: ClientMediaConfig,
): EncryptedFilesystemSettings {
  return {
    root: requiredSetting(config, "CLIENT_MEDIA_ROOT"),
    key: Buffer.from(requiredSetting(config, "CLIENT_MEDIA_KEY"), "base64"),
    keyId: requiredSetting(config, "CLIENT_MEDIA_KEY_ID"),
  };
}

function requiredSetting(
  config: ClientMediaConfig,
  name: FilesystemSettingName,
): string {
  const value = config[name];

  if (value === undefined) {
    throw new Error(`Filesystem client media requires ${name}.`);
  }

  return value;
}
