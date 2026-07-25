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
    // arrange
    const importTimeCallCount = importTimePlatformContainerCallCount;

    // act
    const resolvedRuntimeServicesDuringImport = importTimeCallCount > 0;

    // assert
    expect(resolvedRuntimeServicesDuringImport).toBe(false);
  });

  it("resolves the waitlist controller at request time", async () => {
    // arrange
    const response = Response.json({
      enabled: true,
      cap: 10,
      spotsRemaining: 4,
    });
    mocks.waitlistController.getWaitlist.mockResolvedValue(response);

    // act
    const loaderResponse = loader({
      request: new Request("http://localhost/api/waitlist"),
    } as LoaderFunctionArgs);

    // assert
    await expect(loaderResponse).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistController.getWaitlist).toHaveBeenCalledTimes(1);
  });

  it("resolves the waitlist join controller at request time", async () => {
    // arrange
    const response = Response.json(
      { success: true },
      { status: 201 },
    );
    mocks.waitlistController.join.mockResolvedValue(response);

    // act
    const actionResponse = action({
      request: new Request("http://localhost/api/waitlist", {
        method: "POST",
      }),
    } as ActionFunctionArgs);

    // assert
    await expect(actionResponse).resolves.toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistController.join).toHaveBeenCalledTimes(1);
  });
});
