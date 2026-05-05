import {
  waitlistJoinResponseSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { WaitingListService } from "@eli-coach-platform/domain";
import { describe, expect, it, vi } from "vitest";

import { handleHttpErrorResponse } from "~/server/http.server";

import { WaitlistController } from "./waitlist-controller.server";

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

function createController(service: Partial<WaitingListService>) {
  return new WaitlistController(service as WaitingListService);
}

describe("WaitlistController", () => {
  it("returns a server error signup response when joining fails unexpectedly", async () => {
    const controller = createController({
      joinWaitlist: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    const response = await handleHttpErrorResponse(() =>
      controller.join(createJoinRequest("eli@example.com")),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: {
        code: "server_error",
        message:
          "Something went wrong on our end. Try again in a moment — or email contact@elipersonaltrainer.com if it keeps happening.",
      },
    });
  });

  it("still lets unexpected snapshot failures bubble to the route fallback", async () => {
    const controller = createController({
      getWaitlist: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    await expect(controller.getSnapshot()).rejects.toThrow("database unavailable");
  });

  it("returns a parsed snapshot when the service succeeds", async () => {
    const controller = createController({
      getWaitlist: vi.fn().mockResolvedValue({
        enabled: true,
        cap: 10,
        spotsRemaining: 8,
      }),
    });

    const response = await controller.getSnapshot();
    const body = waitlistSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enabled: true,
      cap: 10,
      spotsRemaining: 8,
    });
  });
});
