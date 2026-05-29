import {
  buildPostgresConnectionString,
  loadRuntimeEnvironment,
  resolveRuntimeDatabaseConnection,
} from "./index";
import { describe, expect, it } from "vitest";

describe("@eli-coach-platform/config runtime environment", () => {
  const loadTestRuntimeEnvironment = (
    overrides: Parameters<typeof loadRuntimeEnvironment>[0] = {},
  ) =>
    loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      PORT: "3000",
      ...overrides,
    });

  it("defaults the waitlist cap to the prototype seed value", () => {
    const environment = loadTestRuntimeEnvironment();

    expect(environment.WAITLIST_CAP).toBe(10);
  });

  it("defaults the active waitlist offer to the first annual launch", () => {
    const environment = loadTestRuntimeEnvironment();

    expect(environment.WAITLIST_ACTIVE_OFFER_PLAN).toBe("12-months");
    expect(environment.WAITLIST_ACTIVE_OFFER_SLUG).toBe("12-months-launch-1");
  });

  it("loads an explicit active waitlist offer", () => {
    const environment = loadTestRuntimeEnvironment({
      WAITLIST_ACTIVE_OFFER_PLAN: "6-months",
      WAITLIST_ACTIVE_OFFER_SLUG: "6-months-launch-1",
    });

    expect(environment.WAITLIST_ACTIVE_OFFER_PLAN).toBe("6-months");
    expect(environment.WAITLIST_ACTIVE_OFFER_SLUG).toBe("6-months-launch-1");
  });

  it("defaults Turnstile to Cloudflare local testing keys", () => {
    const environment = loadTestRuntimeEnvironment();

    expect(environment.TURNSTILE_SITE_KEY).toBe("1x00000000000000000000BB");
    expect(environment.TURNSTILE_SECRET_KEY).toBe("1x0000000000000000000000000000000AA");
    expect(environment.TURNSTILE_SITEVERIFY_URL).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(environment.TURNSTILE_STATIC_TOKEN).toBe("XXXX.DUMMY.TOKEN.XXXX");
  });

  it("rejects production runtime config that still uses Turnstile test keys", () => {
    expect(() =>
      loadRuntimeEnvironment({
        APP_NAME: "eli-coach-platform",
        DATABASE_HOST: "127.0.0.1",
        DATABASE_NAME: "eli_coach_platform",
        DATABASE_PASSWORD: "app-password",
        DATABASE_PORT: "55437",
        DATABASE_USER: "app-user",
        ENVIRONMENT: "production",
        NODE_ENV: "production",
        PORT: "3000",
      }),
    ).toThrow("Production Turnstile configuration requires real Cloudflare keys.");
  });

  it("defaults product email delivery to disabled", () => {
    const environment = loadTestRuntimeEnvironment();

    expect(environment.PRODUCT_EMAIL_PROVIDER).toBe("disabled");
  });

  it("loads deployed Resend config using current contact sender routing", () => {
    const environment = loadTestRuntimeEnvironment({
      NODE_ENV: "production",
      PRODUCT_EMAIL_FROM_ADDRESS: "contact@elipersonaltrainer.com",
      PRODUCT_EMAIL_FROM_NAME: "Eli",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "contact@elipersonaltrainer.com",
      RESEND_API_KEY: "re_123",
      TURNSTILE_SECRET_KEY: "real-secret",
      TURNSTILE_SITE_KEY: "real-site-key",
    });

    expect(environment.PRODUCT_EMAIL_PROVIDER).toBe("resend");
    expect(environment.PRODUCT_EMAIL_FROM_ADDRESS).toBe("contact@elipersonaltrainer.com");
    expect(environment.PRODUCT_EMAIL_REPLY_TO).toBe("contact@elipersonaltrainer.com");
  });

  it("rejects deployed Resend config with a placeholder API key", () => {
    expect(() =>
      loadTestRuntimeEnvironment({
        NODE_ENV: "production",
        PRODUCT_EMAIL_FROM_ADDRESS: "contact@elipersonaltrainer.com",
        PRODUCT_EMAIL_FROM_NAME: "Eli",
        PRODUCT_EMAIL_PROVIDER: "resend",
        PRODUCT_EMAIL_REPLY_TO: "contact@elipersonaltrainer.com",
        RESEND_API_KEY: "replace-me",
        TURNSTILE_SECRET_KEY: "real-secret",
        TURNSTILE_SITE_KEY: "real-site-key",
      }),
    ).toThrow("Resend product email delivery requires a non-placeholder RESEND_API_KEY.");
  });

  it("rejects Resend delivery without an API key", () => {
    expect(() =>
      loadTestRuntimeEnvironment({
        PRODUCT_EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: undefined,
      }),
    ).toThrow("Resend product email delivery requires RESEND_API_KEY.");
  });

  it("rejects Resend delivery with invalid sender routing addresses", () => {
    expect(() =>
      loadTestRuntimeEnvironment({
        PRODUCT_EMAIL_FROM_ADDRESS: "replace-me",
        PRODUCT_EMAIL_PROVIDER: "resend",
        PRODUCT_EMAIL_REPLY_TO: "contact@elipersonaltrainer.com",
        RESEND_API_KEY: "re_123",
      }),
    ).toThrow();
  });

  it("loads deployed Resend config for test and production environments", () => {
    const environment = loadTestRuntimeEnvironment({
      NODE_ENV: "production",
      PRODUCT_EMAIL_FROM_ADDRESS: "hello@test.elipersonaltrainer.com",
      PRODUCT_EMAIL_FROM_NAME: "Eli Personal Trainer",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "support@test.elipersonaltrainer.com",
      RESEND_API_KEY: "re_123",
      TURNSTILE_SECRET_KEY: "real-secret",
      TURNSTILE_SITE_KEY: "real-site-key",
    });

    expect(environment.PRODUCT_EMAIL_PROVIDER).toBe("resend");
    expect(environment.RESEND_API_KEY).toBe("re_123");
    expect(environment.PRODUCT_EMAIL_FROM_ADDRESS).toBe("hello@test.elipersonaltrainer.com");
    expect(environment.PRODUCT_EMAIL_REPLY_TO).toBe("support@test.elipersonaltrainer.com");
  });

  it("loads an explicit positive waitlist cap", () => {
    const environment = loadTestRuntimeEnvironment({
      WAITLIST_CAP: "50",
    });

    expect(environment.WAITLIST_CAP).toBe(50);
  });
});

describe("@eli-coach-platform/config database connection helpers", () => {
  const loadTestRuntimeEnvironment = (
    overrides: Parameters<typeof loadRuntimeEnvironment>[0] = {},
  ) =>
    loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      PORT: "3000",
      ...overrides,
    });

  it("builds a postgres connection string from connection pieces", () => {
    expect(
      buildPostgresConnectionString({
        credentials: {
          name: "app-user",
          password: "app-password",
        },
        database: "eli_coach_platform",
        host: "127.0.0.1",
        port: 55437,
      }),
    ).toBe("postgresql://app-user:app-password@127.0.0.1:55437/eli_coach_platform");
  });

  it("resolves runtime database connection pieces directly from runtime env", () => {
    expect(
      resolveRuntimeDatabaseConnection(loadTestRuntimeEnvironment()),
    ).toEqual({
      credentials: {
        name: "app-user",
        password: "app-password",
      },
      database: "eli_coach_platform",
      host: "127.0.0.1",
      port: 55437,
    });
  });

  it("requires explicit runtime database connection pieces", () => {
    expect(() =>
      resolveRuntimeDatabaseConnection(
        loadTestRuntimeEnvironment({
          DATABASE_HOST: undefined,
          DATABASE_NAME: undefined,
          DATABASE_PASSWORD: undefined,
          DATABASE_PORT: undefined,
          DATABASE_USER: undefined,
        }),
      ),
    ).toThrow(
      "Database connection pieces are required. Expected DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, and DATABASE_PASSWORD.",
    );
  });
});
