import { z } from "zod";

const databasePortSchema = z.coerce.number().int().positive();

const runtimeEnvironmentSchema = z.object({
  APP_NAME: z.string().default("eli-coach-platform"),
  ENVIRONMENT: z.string().default("local"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_PATH: z.string().default("/"),
  PUBLIC_APP_URL: z.string().url().optional(),
  API_PUBLIC_URL: z.string().url().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_PORT: databasePortSchema.optional(),
  DATABASE_USER: z.string().optional(),
});

const databaseBootstrapEnvironmentSchema = z.object({
  POSTGRES_DB: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_USER: z.string(),
  APP_DB_SCHEMA: z.string(),
  APP_DB_APP_USER: z.string(),
  APP_DB_APP_PASSWORD: z.string(),
  APP_DB_MIGRATION_USER: z.string(),
  APP_DB_MIGRATION_PASSWORD: z.string(),
});

export type RuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
export type DatabaseBootstrapEnvironment = z.infer<typeof databaseBootstrapEnvironmentSchema>;
export type DatabaseUserCredentials = {
  name: string;
  password: string;
};
export type DatabaseConnection = {
  credentials: DatabaseUserCredentials;
  database: string;
  host: string;
  port: number;
};

export function loadRuntimeEnvironment(source: NodeJS.ProcessEnv): RuntimeEnvironment {
  return runtimeEnvironmentSchema.parse(source);
}

export function loadDatabaseBootstrapEnvironment(
  source: NodeJS.ProcessEnv,
): DatabaseBootstrapEnvironment {
  return databaseBootstrapEnvironmentSchema.parse(source);
}

export function getApplicationDatabaseUser(
  environment: DatabaseBootstrapEnvironment,
): DatabaseUserCredentials {
  return {
    name: environment.APP_DB_APP_USER,
    password: environment.APP_DB_APP_PASSWORD,
  };
}

export function getBootstrapDatabaseUser(
  environment: DatabaseBootstrapEnvironment,
): DatabaseUserCredentials {
  return {
    name: environment.POSTGRES_USER,
    password: environment.POSTGRES_PASSWORD,
  };
}

export function getMigrationDatabaseUser(
  environment: DatabaseBootstrapEnvironment,
): DatabaseUserCredentials {
  return {
    name: environment.APP_DB_MIGRATION_USER,
    password: environment.APP_DB_MIGRATION_PASSWORD,
  };
}

export function buildPostgresConnectionString(connection: DatabaseConnection): string {
  const connectionUrl = new URL("postgresql://");

  connectionUrl.hostname = connection.host;
  connectionUrl.password = connection.credentials.password;
  connectionUrl.pathname = `/${connection.database}`;
  connectionUrl.port = String(connection.port);
  connectionUrl.username = connection.credentials.name;

  return connectionUrl.toString();
}

export function resolveRuntimeDatabaseConnection(
  environment: RuntimeEnvironment,
): DatabaseConnection {
  if (
    environment.DATABASE_HOST &&
    environment.DATABASE_NAME &&
    environment.DATABASE_PASSWORD &&
    environment.DATABASE_PORT &&
    environment.DATABASE_USER
  ) {
    return {
      credentials: {
        name: environment.DATABASE_USER,
        password: environment.DATABASE_PASSWORD,
      },
      database: environment.DATABASE_NAME,
      host: environment.DATABASE_HOST,
      port: environment.DATABASE_PORT,
    };
  }

  throw new Error(
    "Database connection pieces are required. Expected DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, and DATABASE_PASSWORD.",
  );
}

export function normalizeBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

export function joinBasePath(basePath: string, targetPath: string): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedTargetPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

  if (normalizedBasePath === "/") {
    return normalizedTargetPath;
  }

  return `${normalizedBasePath}${normalizedTargetPath}`;
}
