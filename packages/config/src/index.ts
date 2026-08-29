import { z } from "zod";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000BB";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_RESPONSE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const databasePortSchema = z.coerce.number().int().positive();
const environmentBooleanSchema = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");
const waitlistCapSchema = z.coerce.number().int().positive().default(10);
const waitlistCampaignSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const productEmailDefaultAddress = "contact@evoa.fit";
const placeholderSecretValue = "replace-me";
/**
 * The management API is the only way to publish Store products, and outside
 * LOCAL it is reachable from the internet, so a short secret is a real risk
 * rather than a style question. LOCAL is exempt because its secret guards
 * nothing.
 */
const MINIMUM_MANAGEMENT_API_SECRET_LENGTH = 32;
const turnstileTestKeyPattern = /^[123]x0+[A-Z][A-Z]$/;

const runtimeEnvironmentSchema = z
  .object({
    APP_NAME: z.string().default("eli-coach-platform"),
    ENVIRONMENT: z.string().default("local"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3000),
    APP_BASE_PATH: z.string().default("/"),
    PUBLIC_APP_URL: z.string().url().optional(),
    API_PUBLIC_URL: z.string().url().optional(),
    WAITLIST_MODE: environmentBooleanSchema,
    WAITLIST_CAP: waitlistCapSchema,
    TURNSTILE_SITE_KEY: z.string().min(1).default(TURNSTILE_TEST_SITE_KEY),
    TURNSTILE_SECRET_KEY: z.string().min(1).default(TURNSTILE_TEST_SECRET_KEY),
    TURNSTILE_SITEVERIFY_URL: z.string().url().default(TURNSTILE_SITEVERIFY_URL),
    TURNSTILE_STATIC_TOKEN: z.string().min(1).default(TURNSTILE_TEST_RESPONSE_TOKEN),
    WAITLIST_ACTIVE_OFFER_PLAN: z.enum(["all-bundles"]).default("all-bundles"),
    WAITLIST_ACTIVE_CAMPAIGN_SLUG: waitlistCampaignSlugSchema.default("all-bundles-launch-1"),
    PRODUCT_EMAIL_PROVIDER: z.enum(["disabled", "resend"]).default("disabled"),
    RESEND_API_KEY: z.string().min(1).optional(),
    PRODUCT_EMAIL_FROM_NAME: z.string().min(1).default("Evoa"),
    PRODUCT_EMAIL_FROM_ADDRESS: z.email().default(productEmailDefaultAddress),
    PRODUCT_EMAIL_REPLY_TO: z.email().default(productEmailDefaultAddress),
    STORE_ASSET_ROOT: z.string().trim().min(1),
    MANAGEMENT_API_SECRET: z.string().trim().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_[A-Za-z0-9=]+$/, {
      message: "CLERK_PUBLISHABLE_KEY must be a real Clerk publishable key.",
    }),
    CLERK_SECRET_KEY: z.string().regex(/^sk_(test|live)_[A-Za-z0-9]+$/, {
      message: "CLERK_SECRET_KEY must be a real Clerk secret key.",
    }),
    CLERK_SIGN_IN_URL: z.string().url(),
    CLERK_WEBHOOK_SIGNING_SECRET: z
      .string()
      .regex(/^whsec_.+$/, {
        message: "CLERK_WEBHOOK_SIGNING_SECRET must be a Clerk signing secret.",
      })
      .optional(),
    BOOTSTRAP_COACH_AUTH_SUBJECT_ID: z
      .string()
      .regex(/^user_[A-Za-z0-9]+$/, {
        message: "BOOTSTRAP_COACH_AUTH_SUBJECT_ID must be a Clerk user id.",
      })
      .optional(),
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
      !turnstileTestKeyPattern.test(environment.TURNSTILE_SITE_KEY) &&
      !turnstileTestKeyPattern.test(environment.TURNSTILE_SECRET_KEY)
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
  })
  .superRefine((environment, context) => {
    if (
      !isProductionRuntimeEnvironment(environment) ||
      environment.STORE_ASSET_ROOT !== placeholderSecretValue
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      message:
        "Production Store assets require a non-placeholder STORE_ASSET_ROOT.",
      path: ["STORE_ASSET_ROOT"],
    });
  })
  .superRefine((environment, context) => {
    if (environment.ENVIRONMENT === "local") {
      return;
    }

    if (
      environment.MANAGEMENT_API_SECRET !== placeholderSecretValue &&
      environment.MANAGEMENT_API_SECRET.length >=
        MINIMUM_MANAGEMENT_API_SECRET_LENGTH
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: `Deployed Store management requires a non-placeholder MANAGEMENT_API_SECRET of at least ${MINIMUM_MANAGEMENT_API_SECRET_LENGTH} characters.`,
      path: ["MANAGEMENT_API_SECRET"],
    });
  })
  .superRefine((environment, context) => {
    if (
      environment.PRODUCT_EMAIL_PROVIDER !== "resend" ||
      environment.PUBLIC_APP_URL
    ) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Store delivery through Resend requires PUBLIC_APP_URL.",
      path: ["PUBLIC_APP_URL"],
    });
  })
  .superRefine((environment, context) => {
    if (environment.ENVIRONMENT !== "production") {
      return;
    }
    if (environment.CLERK_WEBHOOK_SIGNING_SECRET) {
      return;
    }
    context.addIssue({
      code: "custom",
      message: "Production requires CLERK_WEBHOOK_SIGNING_SECRET for Clerk webhook verification.",
      path: ["CLERK_WEBHOOK_SIGNING_SECRET"],
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

function isProductionRuntimeEnvironment(environment: {
  ENVIRONMENT: string;
  NODE_ENV: string;
}): boolean {
  return (
    environment.ENVIRONMENT === "production" ||
    (environment.NODE_ENV === "production" &&
      environment.ENVIRONMENT !== "local")
  );
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

type CompleteDatabaseConfiguration = Required<
  Pick<
    RuntimeEnvironment,
    "DATABASE_HOST" | "DATABASE_NAME" | "DATABASE_PASSWORD" | "DATABASE_PORT" | "DATABASE_USER"
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
  environment: RuntimeEnvironment,
): environment is RuntimeEnvironment & CompleteDatabaseConfiguration {
  return Boolean(
    environment.DATABASE_HOST &&
      environment.DATABASE_NAME &&
      environment.DATABASE_PASSWORD &&
      environment.DATABASE_PORT &&
      environment.DATABASE_USER,
  );
}

export function resolveRuntimeDatabaseConnection(
  environment: RuntimeEnvironment,
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

/**
 * Builds an app-internal redirect target with the app base path prepended.
 *
 * React Router prefixes the router basename onto redirects thrown from
 * loaders and actions, but NOT onto redirects thrown from middleware or
 * onto URLs handed to third-party SDKs (e.g. Clerk redirect props). Any
 * redirect target built outside a loader/action must go through this
 * helper, or it will escape the base path on deployments served under one
 * (TEST serves under /eli-coach-platform).
 */
export function buildRedirectPath(basePath: string, targetPath: string): string {
  return joinBasePath(basePath, targetPath);
}
