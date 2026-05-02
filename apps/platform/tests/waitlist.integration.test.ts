import {
  waitlistJoinResponseSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { PlatformContainer } from "../app/server/container.server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PlatformIntegrationTestContext } from "./support/platform-integration-test-context";

const integrationTestContext = new PlatformIntegrationTestContext();

function requirePlatformContainer(platformContainer: PlatformContainer | null): PlatformContainer {
  if (!platformContainer) {
    throw new Error("Platform container has not been created.");
  }

  return platformContainer;
}

function createJoinRequest(email: string): Request {
  const body = new URLSearchParams({ email });

  return new Request("http://localhost/api/waitlist", {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
}

describe.sequential("waitlist API integration", () => {
  let platformContainer: PlatformContainer | null = null;

  beforeAll(async () => {
    await integrationTestContext.start();
    await integrationTestContext.resetToBaselineState();
    platformContainer = integrationTestContext.getPlatformContainer();
  }, 120000);

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
  });

  afterAll(async () => {
    await integrationTestContext.stop();
  });

  it("returns the public waitlist snapshot", async () => {
    const response = await requirePlatformContainer(platformContainer).waitlistController.getSnapshot();
    const body = waitlistSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enabled: true,
      cap: 10,
      spotsRemaining: 10,
    });
  });

  it("persists a normalized email and decrements remaining spots", async () => {
    const response = await requirePlatformContainer(platformContainer).waitlistController.join(
      createJoinRequest("  ELI@Example.COM  "),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.waitlist_entries",
      values: ["eli@example.com"],
      whereClause: "email = $1",
    });

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      spotsRemaining: 9,
    });
    expect(rowCount).toBe(1);
  });

  it("rejects duplicate normalized emails without consuming a second spot", async () => {
    const controller = requirePlatformContainer(platformContainer).waitlistController;

    await controller.join(createJoinRequest("eli@example.com"));
    const duplicateResponse = await controller.join(createJoinRequest(" ELI@example.com "));
    const body = waitlistJoinResponseSchema.parse(await duplicateResponse.json());
    const snapshotResponse = await controller.getSnapshot();
    const snapshot = waitlistSnapshotSchema.parse(await snapshotResponse.json());

    expect(duplicateResponse.status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: {
        code: "already_joined",
        message: "Looks like you're already on the list.",
      },
    });
    expect(snapshot.spotsRemaining).toBe(9);
  });

  it("rejects invalid emails before persistence", async () => {
    const response = await requirePlatformContainer(platformContainer).waitlistController.join(
      createJoinRequest("not-an-email"),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: "invalid_email",
        message: "Please enter a valid email address.",
      },
    });
  });

  it("allows exactly one concurrent submission when one spot remains", async () => {
    const controller = requirePlatformContainer(platformContainer).waitlistController;

    for (let index = 0; index < 9; index += 1) {
      await controller.join(createJoinRequest(`person-${index}@example.com`));
    }

    const responses = await Promise.all([
      controller.join(createJoinRequest("last-one-a@example.com")),
      controller.join(createJoinRequest("last-one-b@example.com")),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    const bodies = await Promise.all(
      responses.map(async (response) => waitlistJoinResponseSchema.parse(await response.json())),
    );
    const successCount = bodies.filter((body) => body.success).length;
    const fullCount = bodies.filter(
      (body) => !body.success && body.error.code === "spots_full",
    ).length;

    expect(statuses).toEqual([201, 409]);
    expect(successCount).toBe(1);
    expect(fullCount).toBe(1);
  });
});
