import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

const mocks = vi.hoisted(() => {
  const waitlistController = {
    getWaitlist: vi.fn(),
    join: vi.fn(),
  };

  return {
    getPlatformContainer: vi.fn(() => ({
      waitlistController,
    })),
    waitlistController,
  };
});

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import { action, loader } from "./api.waitlist";

const importTimePlatformContainerCallCount = mocks.getPlatformContainer.mock.calls.length;

describe("waitlist API route", () => {
  beforeEach(() => {
    mocks.getPlatformContainer.mockClear();
    mocks.waitlistController.getWaitlist.mockReset();
    mocks.waitlistController.join.mockReset();
  });

  it("does not resolve runtime services when the route module is imported", () => {
    expect(importTimePlatformContainerCallCount).toBe(0);
  });

  it("resolves the waitlist controller at request time", async () => {
    const response = Response.json({
      enabled: true,
      cap: 10,
      spotsRemaining: 4,
    });
    mocks.waitlistController.getWaitlist.mockResolvedValue(response);

    await expect(
      loader({
        request: new Request("http://localhost/api/waitlist"),
      } as LoaderFunctionArgs),
    ).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistController.getWaitlist).toHaveBeenCalledTimes(1);
  });

  it("resolves the waitlist join controller at request time", async () => {
    const response = Response.json(
      {
        pricing: "reduced",
        success: true,
        spotsRemaining: 3,
      },
      { status: 201 },
    );
    mocks.waitlistController.join.mockResolvedValue(response);

    await expect(
      action({
        request: new Request("http://localhost/api/waitlist", {
          method: "POST",
        }),
      } as ActionFunctionArgs),
    ).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistController.join).toHaveBeenCalledTimes(1);
  });
});
