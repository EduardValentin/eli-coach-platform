import {
  buildPostgresConnectionString,
  joinBasePath,
  loadRuntimeEnvironment,
  resolveRuntimeDatabaseConnection,
  stripBasePath,
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
      CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_example-secret-value",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
      MANAGEMENT_API_SECRET: "local-management-api-secret-value-32ch",
      STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
      ...overrides,
    });

  it("defaults the waitlist cap to the prototype seed value", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment();

    // assert
    expect(environment.WAITLIST_CAP).toBe(10);
  });

  it("defaults deployments to waitlist mode", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment();

    // assert
    expect(environment.WAITLIST_MODE).toBe(true);
  });

  it("loads an explicitly disabled waitlist mode", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      WAITLIST_MODE: "false",
    });

    // assert
    expect(environment.WAITLIST_MODE).toBe(false);
  });

  it("defaults the active waitlist offer to all coaching bundles", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment();

    // assert
    expect(environment.WAITLIST_ACTIVE_OFFER_PLAN).toBe("all-bundles");
    expect(environment.WAITLIST_ACTIVE_CAMPAIGN_SLUG).toBe("all-bundles-launch-1");
  });

  it("loads an explicit active waitlist offer", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      WAITLIST_ACTIVE_OFFER_PLAN: "all-bundles",
      WAITLIST_ACTIVE_CAMPAIGN_SLUG: "all-bundles-launch-1",
    });

    // assert
    expect(environment.WAITLIST_ACTIVE_OFFER_PLAN).toBe("all-bundles");
    expect(environment.WAITLIST_ACTIVE_CAMPAIGN_SLUG).toBe("all-bundles-launch-1");
  });

  it("rejects retired annual waitlist offers", () => {
    // arrange
    // act
    const loadRetiredAnnualOffer = () =>
      loadTestRuntimeEnvironment({
        WAITLIST_ACTIVE_OFFER_PLAN: "12-months",
        WAITLIST_ACTIVE_CAMPAIGN_SLUG: "12-months-launch-1",
      });

    // assert
    expect(loadRetiredAnnualOffer).toThrow();
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
        MANAGEMENT_API_SECRET: "production-management-api-secret-value",
        NODE_ENV: "production",
        PORT: "3000",
        STORE_ASSET_ROOT: "/srv/store-assets",
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
      PRODUCT_EMAIL_FROM_ADDRESS: "contact@evoa.fit",
      PRODUCT_EMAIL_FROM_NAME: "Eli",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "contact@evoa.fit",
      PUBLIC_APP_URL: "https://evoa.fit",
      RESEND_API_KEY: "re_123",
      TURNSTILE_SECRET_KEY: "real-secret",
      TURNSTILE_SITE_KEY: "real-site-key",
    });

    expect(environment.PRODUCT_EMAIL_PROVIDER).toBe("resend");
    expect(environment.PRODUCT_EMAIL_FROM_ADDRESS).toBe("contact@evoa.fit");
    expect(environment.PRODUCT_EMAIL_REPLY_TO).toBe("contact@evoa.fit");
  });

  it("rejects deployed Resend config with a placeholder API key", () => {
    expect(() =>
      loadTestRuntimeEnvironment({
        NODE_ENV: "production",
        PRODUCT_EMAIL_FROM_ADDRESS: "contact@evoa.fit",
        PRODUCT_EMAIL_FROM_NAME: "Eli",
        PRODUCT_EMAIL_PROVIDER: "resend",
        PRODUCT_EMAIL_REPLY_TO: "contact@evoa.fit",
        PUBLIC_APP_URL: "https://evoa.fit",
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

  it("requires a configured private Store asset root", () => {
    // arrange
    // act
    const loadWithoutAssetRoot = () =>
      loadTestRuntimeEnvironment({
        STORE_ASSET_ROOT: undefined,
      });

    // assert
    expect(loadWithoutAssetRoot).toThrow();
  });

  it("rejects a placeholder Store asset root in production", () => {
    // arrange
    // act
    const loadPlaceholderAssetRoot = () =>
      loadTestRuntimeEnvironment({
        ENVIRONMENT: "production",
        STORE_ASSET_ROOT: "replace-me",
        TURNSTILE_SECRET_KEY: "real-secret",
        TURNSTILE_SITE_KEY: "real-site-key",
      });

    // assert
    expect(loadPlaceholderAssetRoot).toThrow(
      "Production Store assets require a non-placeholder STORE_ASSET_ROOT.",
    );
  });

  it("requires a configured management API secret", () => {
    // arrange
    // act
    const loadWithoutManagementSecret = () =>
      loadTestRuntimeEnvironment({
        MANAGEMENT_API_SECRET: undefined,
      });

    // assert
    expect(loadWithoutManagementSecret).toThrow();
  });

  it.each([
    ["a placeholder", "replace-me"],
    ["a short secret", "too-short"],
  ])("rejects %s management API secret outside LOCAL", (_description, secret) => {
    // arrange
    // act
    const loadWeakManagementSecret = () =>
      loadTestRuntimeEnvironment({
        MANAGEMENT_API_SECRET: secret,
      });

    // assert
    expect(loadWeakManagementSecret).toThrow(
      "Deployed Store management requires a non-placeholder MANAGEMENT_API_SECRET of at least 32 characters.",
    );
  });

  it("accepts a placeholder management API secret in LOCAL, where it guards nothing", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      ENVIRONMENT: "local",
      MANAGEMENT_API_SECRET: "replace-me",
      NODE_ENV: "development",
    });

    // assert
    expect(environment.MANAGEMENT_API_SECRET).toBe("replace-me");
  });

  it("defaults Clerk credentials to placeholders so the production build needs none", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      CLERK_PUBLISHABLE_KEY: undefined,
      CLERK_SECRET_KEY: undefined,
      CLERK_WEBHOOK_SIGNING_SECRET: undefined,
      ENVIRONMENT: "local",
    });

    // assert
    expect(environment.CLERK_PUBLISHABLE_KEY).toBe("replace-me");
    expect(environment.CLERK_SECRET_KEY).toBe("replace-me");
    expect(environment.CLERK_WEBHOOK_SIGNING_SECRET).toBe("replace-me");
  });

  it.each([
    ["publishable key", "CLERK_PUBLISHABLE_KEY"],
    ["secret key", "CLERK_SECRET_KEY"],
    ["webhook signing secret", "CLERK_WEBHOOK_SIGNING_SECRET"],
  ])("rejects a placeholder Clerk %s outside LOCAL", (_description, variable) => {
    // arrange
    // act
    const loadPlaceholderClerkKey = () =>
      loadTestRuntimeEnvironment({
        CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
        CLERK_SECRET_KEY: "sk_test_example-secret-value",
        CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
        [variable]: "replace-me",
      });

    // assert
    expect(loadPlaceholderClerkKey).toThrow(/must be a real Clerk/);
  });

  it("accepts placeholder Clerk credentials in LOCAL, where authentication is opt-in", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      CLERK_PUBLISHABLE_KEY: "replace-me",
      CLERK_SECRET_KEY: "replace-me",
      CLERK_WEBHOOK_SIGNING_SECRET: "replace-me",
      ENVIRONMENT: "local",
      NODE_ENV: "development",
    });

    // assert
    expect(environment.CLERK_SECRET_KEY).toBe("replace-me");
  });

  it.each([
    ["a publishable key in the secret slot", "pk_test_x", "pk_test_x"],
    ["a secret key in the publishable slot", "sk_test_x", "sk_test_x"],
  ])("rejects %s", (_description, secret, publishable) => {
    // arrange
    // act
    const loadSwappedClerkKeys = () =>
      loadTestRuntimeEnvironment({
        CLERK_PUBLISHABLE_KEY: publishable,
        CLERK_SECRET_KEY: secret,
      });

    // assert
    expect(loadSwappedClerkKeys).toThrow();
  });

  it("carries the bootstrap coach subject when it looks like a Clerk user id", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      BOOTSTRAP_COACH_AUTH_SUBJECT_ID: "user_3IFDlg6jdxLFf4J7MWYZO95WRzN",
      CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_example-secret-value",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
    });

    // assert
    expect(environment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID).toBe(
      "user_3IFDlg6jdxLFf4J7MWYZO95WRzN",
    );
  });

  it("rejects a bootstrap coach subject that is not a Clerk user id", () => {
    // arrange
    // act
    const loadEmailAsBootstrapCoach = () =>
      loadTestRuntimeEnvironment({
        BOOTSTRAP_COACH_AUTH_SUBJECT_ID: "coach@evoa.fit",
        CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
        CLERK_SECRET_KEY: "sk_test_example-secret-value",
        CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
      });

    // assert
    expect(loadEmailAsBootstrapCoach).toThrow();
  });

  it("rejects every Cloudflare Turnstile test-key family in deployed environments", () => {
    // arrange
    const loadWithTestSiteKey = () =>
      loadTestRuntimeEnvironment({
        ENVIRONMENT: "test",
        NODE_ENV: "production",
        TURNSTILE_SECRET_KEY: "real-secret-key",
        TURNSTILE_SITE_KEY: "2x00000000000000000000AB",
      });
    const loadWithTestSecretKey = () =>
      loadTestRuntimeEnvironment({
        ENVIRONMENT: "test",
        NODE_ENV: "production",
        TURNSTILE_SECRET_KEY: "3x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: "real-site-key",
      });

    // act
    const loadDeployedEnvironmentWithTestKeys = [
      loadWithTestSiteKey,
      loadWithTestSecretKey,
    ];

    // assert
    for (const loadEnvironment of loadDeployedEnvironmentWithTestKeys) {
      expect(loadEnvironment).toThrow(
        "Production Turnstile configuration requires real Cloudflare keys.",
      );
    }
  });

  it("requires a public app URL when Resend delivery is enabled", () => {
    // arrange
    // act
    const loadWithoutPublicUrl = () =>
      loadTestRuntimeEnvironment({
        PRODUCT_EMAIL_PROVIDER: "resend",
        PUBLIC_APP_URL: undefined,
        RESEND_API_KEY: "re_123",
      });

    // assert
    expect(loadWithoutPublicUrl).toThrow(
      "Store delivery through Resend requires PUBLIC_APP_URL.",
    );
  });

  it("rejects Resend delivery with invalid sender routing addresses", () => {
    expect(() =>
      loadTestRuntimeEnvironment({
        PRODUCT_EMAIL_FROM_ADDRESS: "replace-me",
        PRODUCT_EMAIL_PROVIDER: "resend",
        PRODUCT_EMAIL_REPLY_TO: "contact@evoa.fit",
        RESEND_API_KEY: "re_123",
      }),
    ).toThrow();
  });

  it("loads the expected TEST deployment configuration", () => {
    // arrange
    const testDeploymentConfiguration = {
      NODE_ENV: "production",
      PRODUCT_EMAIL_FROM_ADDRESS: "hello@test.evoa.fit",
      PRODUCT_EMAIL_FROM_NAME: "Evoa",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "support@test.evoa.fit",
      PUBLIC_APP_URL: "https://test.evoa.fit",
      RESEND_API_KEY: "re_123",
      TURNSTILE_SECRET_KEY: "real-secret",
      TURNSTILE_SITE_KEY: "real-site-key",
    } as const;

    // act
    const environment = loadTestRuntimeEnvironment({
      ...testDeploymentConfiguration,
    });

    // assert
    expect(environment.PRODUCT_EMAIL_PROVIDER).toBe("resend");
    expect(environment.PUBLIC_APP_URL).toBe("https://test.evoa.fit");
    expect(environment.RESEND_API_KEY).toBe("re_123");
    expect(environment.PRODUCT_EMAIL_FROM_ADDRESS).toBe("hello@test.evoa.fit");
    expect(environment.PRODUCT_EMAIL_REPLY_TO).toBe("support@test.evoa.fit");
    expect(environment.TURNSTILE_SITE_KEY).toBe("real-site-key");
    expect(environment.TURNSTILE_SECRET_KEY).toBe("real-secret");
  });

  it("loads an explicit positive waitlist cap", () => {
    const environment = loadTestRuntimeEnvironment({
      WAITLIST_CAP: "50",
    });

    expect(environment.WAITLIST_CAP).toBe(50);
  });
  it("boots in LOCAL with real Clerk keys but no webhook secret, which localhost cannot receive", () => {
    // arrange
    // act
    const environment = loadTestRuntimeEnvironment({
      CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_example-secret-value",
      CLERK_WEBHOOK_SIGNING_SECRET: "replace-me",
      ENVIRONMENT: "local",
      NODE_ENV: "development",
    });

    // assert
    expect(environment.CLERK_WEBHOOK_SIGNING_SECRET).toBe("replace-me");
  });

  it("still rejects a malformed Clerk key supplied in LOCAL", () => {
    // arrange
    // act
    const loadMistypedClerkKey = () =>
      loadTestRuntimeEnvironment({
        CLERK_PUBLISHABLE_KEY: "pk_tset_typo",
        CLERK_SECRET_KEY: "replace-me",
        CLERK_WEBHOOK_SIGNING_SECRET: "replace-me",
        ENVIRONMENT: "local",
        NODE_ENV: "development",
      });

    // assert
    expect(loadMistypedClerkKey).toThrow(
      "CLERK_PUBLISHABLE_KEY must be a real Clerk publishable key (pk_test_… or pk_live_…).",
    );
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
      CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_example-secret-value",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
      MANAGEMENT_API_SECRET: "local-management-api-secret-value-32ch",
      STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
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

describe("stripBasePath", () => {
  it.each([
    ["/eli-coach-platform", "/eli-coach-platform/client", "/client"],
    ["/eli-coach-platform/", "/eli-coach-platform/client", "/client"],
    ["/eli-coach-platform", "/eli-coach-platform", "/"],
    ["/", "/client", "/client"],
  ])("strips %s from %s", (basePath, targetPath, expected) => {
    // arrange
    // act
    const stripped = stripBasePath(basePath, targetPath);

    // assert
    expect(stripped).toBe(expected);
  });

  it("leaves a path that only looks like the base alone", () => {
    // arrange
    const lookalike = "/eli-coach-platform-staging/client";

    // act
    const stripped = stripBasePath("/eli-coach-platform", lookalike);

    // assert
    expect(stripped).toBe(lookalike);
  });

  it("round-trips whatever joinBasePath produced", () => {
    // arrange
    const basePath = "/eli-coach-platform";

    // act
    const stripped = stripBasePath(basePath, joinBasePath(basePath, "/coach"));

    // assert
    expect(stripped).toBe("/coach");
  });
});
