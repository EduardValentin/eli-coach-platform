import { describe, expect, it } from "vitest";

import {
  createManagementAuthConfig,
  MANAGEMENT_AGENT_PRINCIPAL_ID,
} from "./management-auth-config.server";

describe("createManagementAuthConfig", () => {
  it("accepts any transport when the app is published over http", () => {
    // arrange
    const managementApi = { MANAGEMENT_API_SECRET: "local-secret" };

    // act
    const config = createManagementAuthConfig(managementApi, {
      PUBLIC_APP_URL: "http://localhost:3000",
    });

    // assert
    expect(config).toEqual({
      principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
      secret: "local-secret",
      transportPolicy: "any",
    });
  });

  it("requires https when the app is published over https", () => {
    // arrange
    const managementApi = { MANAGEMENT_API_SECRET: "deployed-secret" };

    // act
    const config = createManagementAuthConfig(managementApi, {
      PUBLIC_APP_URL: "https://app.evoa.fitness",
    });

    // assert
    expect(config.transportPolicy).toBe("https_required");
  });
});
