import { describe, expect, it } from "vitest";

import { AppMetadataController } from "./app-metadata-controller.server";
import { appMetadataSchema } from "./service-metadata";

describe("AppMetadataController", () => {
  it("returns application metadata from the controller", async () => {
    // arrange
    const controller = new AppMetadataController({
      appName: "eli-coach-platform",
      environment: "test",
      version: "sha-123",
    });

    // act
    const response = controller.getMetadata();

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      appMetadataSchema.parse({
        appName: "eli-coach-platform",
        environment: "test",
        version: "sha-123",
      }),
    );
  });
});
