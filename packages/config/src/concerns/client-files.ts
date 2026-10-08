import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const COMMITTED_DEVELOPMENT_KEY =
  "Lhg6svmQ58XvcXGOkFUr8enaWRLPDNzkZYsAt+zWgdc=";
const BASE64_OF_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;
const PLACEHOLDER_SECRET = "replace-me";

export const clientFilesShape = {
  CLIENT_MEDIA_PROVIDER: z.enum(["memory", "filesystem"]).default("memory"),
  CLIENT_MEDIA_ROOT: z.string().trim().min(1).optional(),
  CLIENT_MEDIA_KEY: z.string().min(1).optional(),
  CLIENT_MEDIA_KEY_ID: z.string().trim().min(1).optional(),
  CLIENT_RESOURCE_ROOT: z.string().trim().min(1),
};

export type ClientFilesConfig = z.infer<z.ZodObject<typeof clientFilesShape>>;

type FilesystemSettingName =
  "CLIENT_MEDIA_ROOT" | "CLIENT_MEDIA_KEY" | "CLIENT_MEDIA_KEY_ID";

const FILESYSTEM_SETTING_NAMES: readonly FilesystemSettingName[] = [
  "CLIENT_MEDIA_ROOT",
  "CLIENT_MEDIA_KEY",
  "CLIENT_MEDIA_KEY_ID",
];

export function refineClientFiles(
  environment: ClientFilesConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (environment.CLIENT_MEDIA_PROVIDER === "filesystem") {
    refineFilesystemSettingsPresent(environment, context);
  }

  refineKeyFormat(environment, context);

  if (isProductionRuntime(environment)) {
    refineProductionClientMedia(environment, context);
    refineProductionClientResources(environment, context);
  }
}

function refineKeyFormat(
  environment: ClientFilesConfig,
  context: z.RefinementCtx,
): void {
  const key = environment.CLIENT_MEDIA_KEY;

  if (key === undefined || BASE64_OF_32_BYTES.test(key)) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: "CLIENT_MEDIA_KEY must be the base64 encoding of 32 bytes.",
    path: ["CLIENT_MEDIA_KEY"],
  });
}

function refineProductionClientMedia(
  environment: ClientFilesConfig,
  context: z.RefinementCtx,
): void {
  if (environment.CLIENT_MEDIA_PROVIDER === "memory") {
    context.addIssue({
      code: "custom",
      message:
        "CLIENT_MEDIA_PROVIDER must be filesystem in a production runtime.",
      path: ["CLIENT_MEDIA_PROVIDER"],
    });
  }

  if (environment.CLIENT_MEDIA_KEY === COMMITTED_DEVELOPMENT_KEY) {
    context.addIssue({
      code: "custom",
      message:
        "Production client media requires a CLIENT_MEDIA_KEY other than the committed development key.",
      path: ["CLIENT_MEDIA_KEY"],
    });
  }
}

function refineProductionClientResources(
  environment: ClientFilesConfig,
  context: z.RefinementCtx,
): void {
  if (environment.CLIENT_RESOURCE_ROOT !== PLACEHOLDER_SECRET) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production client resources require a non-placeholder CLIENT_RESOURCE_ROOT.",
    path: ["CLIENT_RESOURCE_ROOT"],
  });
}

function refineFilesystemSettingsPresent(
  environment: ClientFilesConfig,
  context: z.RefinementCtx,
): void {
  for (const name of FILESYSTEM_SETTING_NAMES) {
    if (environment[name] === undefined) {
      context.addIssue({
        code: "custom",
        message: `Filesystem client media requires ${name}.`,
        path: [name],
      });
    }
  }
}
