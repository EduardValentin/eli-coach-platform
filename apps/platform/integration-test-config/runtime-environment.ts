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

// Loaded before the application is ever imported; containers then add their
// addresses to it once they start.
process.loadEnvFile(integrationEnvironmentFilePath);

const databaseBootstrapEnvironment = loadDatabaseBootstrapEnvironment(process.env);
const runtimeEnvironment = loadRuntimeEnvironment(process.env);

export function loadIntegrationTestEnvironment(): IntegrationTestEnvironment {
  return { databaseBootstrapEnvironment, runtimeEnvironment };
}
