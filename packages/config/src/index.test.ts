import { buildPostgresConnectionString, resolveRuntimeDatabaseConnection } from "./index";
import { describe, expect, it } from "vitest";

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
        port: 55433,
      }),
    ).toBe("postgresql://app-user:app-password@127.0.0.1:55433/eli_coach_platform");
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
        DATABASE_PORT: 55433,
        DATABASE_USER: "app-user",
        ENVIRONMENT: "test",
        NODE_ENV: "test",
        PORT: 3000,
        PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toEqual({
      credentials: {
        name: "app-user",
        password: "app-password",
      },
      database: "eli_coach_platform",
      host: "127.0.0.1",
      port: 55433,
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
      }),
    ).toThrow(
      "Database connection pieces are required. Expected DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, and DATABASE_PASSWORD.",
    );
  });
});
