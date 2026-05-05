import {
  buildPostgresConnectionString,
  loadRuntimeEnvironment,
  resolveRuntimeDatabaseConnection,
} from "./index";
import { describe, expect, it } from "vitest";

describe("@eli-coach-platform/config runtime environment", () => {
  it("defaults the waitlist cap to the prototype seed value", () => {
    const environment = loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      PORT: "3000",
    });

    expect(environment.WAITLIST_CAP).toBe(10);
  });

  it("defaults Turnstile to Cloudflare local testing keys", () => {
    const environment = loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      PORT: "3000",
    });

    expect(environment.TURNSTILE_SITE_KEY).toBe("1x00000000000000000000BB");
    expect(environment.TURNSTILE_SECRET_KEY).toBe("1x0000000000000000000000000000000AA");
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

  it("loads an explicit positive waitlist cap", () => {
    const environment = loadRuntimeEnvironment({
      APP_NAME: "eli-coach-platform",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      PORT: "3000",
      WAITLIST_CAP: "50",
    });

    expect(environment.WAITLIST_CAP).toBe(50);
  });
});

describe("@eli-coach-platform/config database connection helpers", () => {
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
      resolveRuntimeDatabaseConnection({
        API_PUBLIC_URL: "http://localhost:18080",
        APP_BASE_PATH: "/",
        APP_NAME: "eli-coach-platform",
        DATABASE_HOST: "127.0.0.1",
        DATABASE_NAME: "eli_coach_platform",
        DATABASE_PASSWORD: "app-password",
        DATABASE_PORT: 55437,
        DATABASE_USER: "app-user",
        ENVIRONMENT: "test",
        NODE_ENV: "test",
        PORT: 3000,
        PUBLIC_APP_URL: "http://localhost:3000",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
        WAITLIST_CAP: 10,
      }),
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
      resolveRuntimeDatabaseConnection({
        API_PUBLIC_URL: "http://localhost:18080",
        APP_BASE_PATH: "/",
        APP_NAME: "eli-coach-platform",
        ENVIRONMENT: "test",
        NODE_ENV: "test",
        PORT: 3000,
        PUBLIC_APP_URL: "http://localhost:3000",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
        WAITLIST_CAP: 10,
      }),
    ).toThrow(
      "Database connection pieces are required. Expected DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, and DATABASE_PASSWORD.",
    );
  });
});
