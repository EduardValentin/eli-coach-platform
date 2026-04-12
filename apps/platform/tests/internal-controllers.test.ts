import { appMetadataSchema, healthStatusSchema } from "@eli-coach-platform/contracts";
import { describe, expect, it } from "vitest";
import { ApiEventsController } from "../app/modules/internal/api-events-controller.server";
import { AppMetadataController } from "../app/modules/internal/app-metadata-controller.server";
import { ReadyzController } from "../app/modules/internal/readyz-controller.server";

describe("internal controllers", () => {
  it("returns application metadata from the controller", async () => {
    const controller = new AppMetadataController({
      appName: "eli-coach-platform",
      environment: "test",
      version: "sha-123",
    });
    const response = controller.handle();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      appMetadataSchema.parse({
        appName: "eli-coach-platform",
        environment: "test",
        version: "sha-123",
      }),
    );
  });

  it("returns an event-stream readiness payload", async () => {
    const controller = new ApiEventsController();
    const response = controller.handle();
    const payload = response
      .text()
      .then((body) => body.match(/^event: ready\ndata: (.+)\n\n$/)?.[1] ?? "");

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    await expect(payload).resolves.toSatisfy((rawPayload: string) => {
      const parsedPayload = healthStatusSchema.parse(JSON.parse(rawPayload));

      return parsedPayload.status === "ok";
    });
  });

  it("returns a plain readiness response", async () => {
    const controller = new ReadyzController();
    const response = controller.handle();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(response.text()).resolves.toBe("ok");
  });
});
