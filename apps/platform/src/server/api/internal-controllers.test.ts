import { appMetadataSchema } from "./service-metadata";
import { describe, expect, it } from "vitest";

import { AppMetadataController } from "./app-metadata-controller.server";
import { ReadyzController } from "./readyz-controller.server";

describe("internal controllers", () => {
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

  it("returns a plain readiness response", async () => {
    // arrange
    const controller = new ReadyzController();

    // act
    const response = controller.getStatus();

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(response.text()).resolves.toBe("ok");
  });
});
