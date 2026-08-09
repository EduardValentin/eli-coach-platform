import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  getPlatformContainer: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import * as botDetectionRoute from "./api.bot-detection";

describe("bot detection API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformContainer.mockReturnValue({
      botDetectionController: { getConfig: mocks.getConfig },
    });
  });

  it("resolves public bot configuration at request time", async () => {
    // arrange
    const response = Response.json({
      provider: "turnstile",
      siteKey: "runtime-site-key",
    });
    mocks.getConfig.mockReturnValue(response);

    // act
    const loaded = await botDetectionRoute.loader({
      request: new Request("https://eli.example/api/bot-detection"),
    } as LoaderFunctionArgs);

    // assert
    expect(loaded).toBe(response);
    expect(mocks.getPlatformContainer).toHaveBeenCalledTimes(1);
    expect(mocks.getConfig).toHaveBeenCalledTimes(1);
  });

  it("rejects mutations without resolving runtime services", async () => {
    // arrange
    const actionArgs = {} as ActionFunctionArgs;

    // act
    const response = await botDetectionRoute.action(actionArgs);

    // assert
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
    expect(mocks.getPlatformContainer).not.toHaveBeenCalled();
  });
});
