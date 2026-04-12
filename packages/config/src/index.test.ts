import {
  buildPostgresConnectionString,
  parsePostgresConnectionString,
  resolveRuntimeDatabaseConnection,
} from "./index";
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
        DATABASE_URL: undefined,
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

  it("keeps a legacy DATABASE_URL fallback parseable during the transition", () => {
    expect(
      parsePostgresConnectionString(
        "postgresql://app-user:app-password@127.0.0.1:55433/eli_coach_platform",
      ),
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
});
