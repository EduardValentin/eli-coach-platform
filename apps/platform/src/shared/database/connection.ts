import { z } from "zod";

const databasePortSchema = z.coerce.number().int().positive();

export const databaseShape = {
  DATABASE_HOST: z.string().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_PORT: databasePortSchema.optional(),
  DATABASE_USER: z.string().optional(),
};

export type DatabaseConfig = z.infer<z.ZodObject<typeof databaseShape>>;

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

export type DatabaseBootstrapEnvironment = z.infer<
  typeof databaseBootstrapEnvironmentSchema
>;

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

export function buildPostgresConnectionString(
  connection: DatabaseConnection,
): string {
  const connectionUrl = new URL("postgresql://");

  connectionUrl.hostname = connection.host;
  connectionUrl.password = connection.credentials.password;
  connectionUrl.pathname = `/${connection.database}`;
  connectionUrl.port = String(connection.port);
  connectionUrl.username = connection.credentials.name;

  return connectionUrl.toString();
}

type CompleteDatabaseConfiguration = Required<
  Pick<
    DatabaseConfig,
    | "DATABASE_HOST"
    | "DATABASE_NAME"
    | "DATABASE_PASSWORD"
    | "DATABASE_PORT"
    | "DATABASE_USER"
  >
>;

/**
 * Presence check only — never probes connectivity. Shared by
 * `resolveRuntimeDatabaseConnection` (which needs the five fields narrowed
 * to build a connection) and the `/readyz` gate (which only needs the
 * boolean, without ever assembling a connection string), so both sides agree
 * on exactly which fields "configured" means without duplicating the check.
 */
export function hasCompleteDatabaseConfiguration(
  environment: DatabaseConfig,
): environment is DatabaseConfig & CompleteDatabaseConfiguration {
  return Boolean(
    environment.DATABASE_HOST &&
    environment.DATABASE_NAME &&
    environment.DATABASE_PASSWORD &&
    environment.DATABASE_PORT &&
    environment.DATABASE_USER,
  );
}

export function resolveRuntimeDatabaseConnection(
  environment: DatabaseConfig,
): DatabaseConnection {
  if (hasCompleteDatabaseConfiguration(environment)) {
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
