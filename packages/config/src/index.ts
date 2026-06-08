import { z } from "zod";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000BB";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_RESPONSE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const databasePortSchema = z.coerce.number().int().positive();
const waitlistCapSchema = z.coerce.number().int().positive().default(10);
const waitlistOfferSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const productEmailDefaultAddress = "contact@elipersonaltrainer.com";
const placeholderSecretValue = "replace-me";

const runtimeEnvironmentSchema = z
  .object({
    APP_NAME: z.string().default("eli-coach-platform"),
    ENVIRONMENT: z.string().default("local"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    APP_BASE_PATH: z.string().default("/"),
    PUBLIC_APP_URL: z.string().url().optional(),
    API_PUBLIC_URL: z.string().url().optional(),
    WAITLIST_CAP: waitlistCapSchema,
    TURNSTILE_SITE_KEY: z.string().min(1).default(TURNSTILE_TEST_SITE_KEY),
    TURNSTILE_SECRET_KEY: z.string().min(1).default(TURNSTILE_TEST_SECRET_KEY),
    TURNSTILE_SITEVERIFY_URL: z.string().url().default(TURNSTILE_SITEVERIFY_URL),
    TURNSTILE_STATIC_TOKEN: z.string().min(1).default(TURNSTILE_TEST_RESPONSE_TOKEN),
    WAITLIST_ACTIVE_OFFER_PLAN: z.enum(["all-bundles"]).default("all-bundles"),
    WAITLIST_ACTIVE_OFFER_SLUG: waitlistOfferSlugSchema.default("all-bundles-launch-1"),
    PRODUCT_EMAIL_PROVIDER: z.enum(["disabled", "resend"]).default("disabled"),
    RESEND_API_KEY: z.string().min(1).optional(),
    PRODUCT_EMAIL_FROM_NAME: z.string().min(1).default("Eli Personal Trainer"),
    PRODUCT_EMAIL_FROM_ADDRESS: z.email().default(productEmailDefaultAddress),
    PRODUCT_EMAIL_REPLY_TO: z.email().default(productEmailDefaultAddress),
    DATABASE_HOST: z.string().optional(),
    DATABASE_NAME: z.string().optional(),
    DATABASE_PASSWORD: z.string().optional(),
    DATABASE_PORT: databasePortSchema.optional(),
    DATABASE_USER: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (!isProductionRuntimeEnvironment(environment)) {
      return;
    }

    if (
      environment.TURNSTILE_SITE_KEY !== TURNSTILE_TEST_SITE_KEY &&
      environment.TURNSTILE_SECRET_KEY !== TURNSTILE_TEST_SECRET_KEY
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Production Turnstile configuration requires real Cloudflare keys.",
      path: ["TURNSTILE_SITE_KEY"],
    });
  })
  .superRefine((environment, context) => {
    if (environment.PRODUCT_EMAIL_PROVIDER !== "resend") {
      return;
    }

    if (!environment.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        message: "Resend product email delivery requires RESEND_API_KEY.",
        path: ["RESEND_API_KEY"],
      });
    }

    if (environment.RESEND_API_KEY !== placeholderSecretValue) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Resend product email delivery requires a non-placeholder RESEND_API_KEY.",
      path: ["RESEND_API_KEY"],
    });
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

function isProductionRuntimeEnvironment(environment: { ENVIRONMENT: string }): boolean {
  return environment.ENVIRONMENT === "production";
}

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
