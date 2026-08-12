import {
  loadDatabaseBootstrapEnvironment,
  loadRuntimeEnvironment,
  type DatabaseBootstrapEnvironment,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type IntegrationTestEnvironment = {
  databaseBootstrapEnvironment: DatabaseBootstrapEnvironment;
  runtimeEnvironment: RuntimeEnvironment;
};

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const integrationEnvironmentFilePath = resolve(currentDirectory, "./.env.integration");

// Loaded into the process before the application is ever imported, so the
// application reads its own configuration from the environment exactly as a
// deployed instance does. Containers add their addresses to it once they start.
process.loadEnvFile(integrationEnvironmentFilePath);

const databaseBootstrapEnvironment = loadDatabaseBootstrapEnvironment(process.env);
const runtimeEnvironment = loadRuntimeEnvironment(process.env);

export function loadIntegrationTestEnvironment(): IntegrationTestEnvironment {
  return { databaseBootstrapEnvironment, runtimeEnvironment };
}
