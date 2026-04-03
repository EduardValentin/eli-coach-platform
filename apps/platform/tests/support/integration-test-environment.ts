import { loadRuntimeEnvironment, type RuntimeEnvironment } from "@eli-coach-platform/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type DatabaseUserCredentials = {
  name: string;
  password: string;
};

type IntegrationTestEnvironmentValues = {
  APP_NAME: string;
  APP_DB_APP_PASSWORD: string;
  APP_DB_APP_USER: string;
  APP_DB_MIGRATION_PASSWORD: string;
  APP_DB_MIGRATION_USER: string;
  APP_DB_SCHEMA: string;
  ENVIRONMENT: string;
  NODE_ENV: "development" | "production" | "test";
  POSTGRES_DB: string;
};

export type IntegrationTestEnvironment = {
  applicationUser: DatabaseUserCredentials;
  databaseName: string;
  migrationUser: DatabaseUserCredentials;
  runtimeEnvironment: RuntimeEnvironment;
  schemaName: string;
  withDatabaseUrl(databaseUrl: string): RuntimeEnvironment;
};

function parseEnvFile(filePath: string): Record<string, string> {
  const environmentEntries = readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex < 0) {
        throw new Error(`Invalid environment line: ${line}`);
      }

      return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
    });

  return Object.fromEntries(environmentEntries);
}

function readRequiredValue(
  values: Record<string, string>,
  key: keyof IntegrationTestEnvironmentValues,
): string {
  const value = values[key];

  if (!value) {
    throw new Error(`Missing ${key} in integration test environment file.`);
  }

  return value;
}

function parseNodeEnvironment(value: string): IntegrationTestEnvironmentValues["NODE_ENV"] {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  throw new Error(`Invalid NODE_ENV value in integration test environment file: ${value}`);
}

function loadIntegrationTestEnvironmentValues(filePath: string): IntegrationTestEnvironmentValues {
  const values = parseEnvFile(filePath);

  return {
    APP_NAME: readRequiredValue(values, "APP_NAME"),
    APP_DB_APP_PASSWORD: readRequiredValue(values, "APP_DB_APP_PASSWORD"),
    APP_DB_APP_USER: readRequiredValue(values, "APP_DB_APP_USER"),
    APP_DB_MIGRATION_PASSWORD: readRequiredValue(values, "APP_DB_MIGRATION_PASSWORD"),
    APP_DB_MIGRATION_USER: readRequiredValue(values, "APP_DB_MIGRATION_USER"),
    APP_DB_SCHEMA: readRequiredValue(values, "APP_DB_SCHEMA"),
    ENVIRONMENT: readRequiredValue(values, "ENVIRONMENT"),
    NODE_ENV: parseNodeEnvironment(readRequiredValue(values, "NODE_ENV")),
    POSTGRES_DB: readRequiredValue(values, "POSTGRES_DB"),
  };
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const integrationEnvironmentFilePath = resolve(currentDirectory, "../.env.integration");
const integrationEnvironmentValues = loadIntegrationTestEnvironmentValues(
  integrationEnvironmentFilePath,
);

export function loadIntegrationTestEnvironment(): IntegrationTestEnvironment {
  return {
    applicationUser: {
      name: integrationEnvironmentValues.APP_DB_APP_USER,
      password: integrationEnvironmentValues.APP_DB_APP_PASSWORD,
    },
    databaseName: integrationEnvironmentValues.POSTGRES_DB,
    migrationUser: {
      name: integrationEnvironmentValues.APP_DB_MIGRATION_USER,
      password: integrationEnvironmentValues.APP_DB_MIGRATION_PASSWORD,
    },
    runtimeEnvironment: loadRuntimeEnvironment(integrationEnvironmentValues),
    schemaName: integrationEnvironmentValues.APP_DB_SCHEMA,
    withDatabaseUrl(databaseUrl) {
      return loadRuntimeEnvironment({
        ...integrationEnvironmentValues,
        DATABASE_URL: databaseUrl,
      });
    },
  };
}
