import { appMetadataSchema } from "@eli-coach-platform/contracts";
import { describe, expect, it } from "vitest";
import { AppMetadataController } from "../app/modules/internal/app-metadata-controller.server";
import { ReadyzController } from "../app/modules/internal/readyz-controller.server";

describe("internal controllers", () => {
  it("returns application metadata from the controller", async () => {
    const controller = new AppMetadataController({
      appName: "eli-coach-platform",
      environment: "test",
      version: "sha-123",
    });
    const response = controller.getMetadata();

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
    const controller = new ReadyzController();
    const response = controller.getStatus();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(response.text()).resolves.toBe("ok");
  });
});
