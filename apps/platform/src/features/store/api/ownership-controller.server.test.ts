import type { LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
}));

// @clerk/react-router/server is the third-party auth SDK boundary (not our own
// API layer), so mocking it here is the accepted seam per AGENTS.md.
vi.mock("@clerk/react-router/server", () => ({
  getAuth: mocks.getAuth,
}));

import type { VerifiedEmailDirectory } from "@eli-coach-platform/domain";

import { StoreOwnershipController } from "./ownership-controller.server";

const AUTH_SUBJECT_ID = "user_2aBcDeFgHiJkLmNoPqRsTuVwXyZ";

const verifiedEmailDirectory: VerifiedEmailDirectory = {
  listVerifiedEmails: vi.fn(),
};

function createArgs(): LoaderFunctionArgs {
  return {
    request: new Request("https://evoa.fit/store"),
    params: {},
    context: {},
  } as unknown as LoaderFunctionArgs;
}

describe("StoreOwnershipController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links nothing for a signed-out visitor", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ userId: null });
    const linkPriorAcquisitions = vi.fn();
    const createVerifiedEmailDirectory = vi.fn();
    const controller = new StoreOwnershipController({
      createVerifiedEmailDirectory,
      linkingService: { linkPriorAcquisitions },
    });

    // act
    await controller.linkPriorAcquisitions(createArgs());

    // assert
    expect(linkPriorAcquisitions).not.toHaveBeenCalled();
    expect(createVerifiedEmailDirectory).not.toHaveBeenCalled();
  });

  it("links the signed-in subject through a directory built for this request", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ userId: AUTH_SUBJECT_ID });
    const linkPriorAcquisitions = vi
      .fn()
      .mockResolvedValue({ status: "linked", claimedRecipientCount: 1 });
    const controller = new StoreOwnershipController({
      createVerifiedEmailDirectory: () => verifiedEmailDirectory,
      linkingService: { linkPriorAcquisitions },
    });
    const args = createArgs();

    // act
    await controller.linkPriorAcquisitions(args);

    // assert
    expect(linkPriorAcquisitions).toHaveBeenCalledWith({
      authSubjectId: AUTH_SUBJECT_ID,
      verifiedEmailDirectory,
    });
  });

  it("swallows a linking failure so the page it runs behind still renders", async () => {
    // arrange
    mocks.getAuth.mockResolvedValue({ userId: AUTH_SUBJECT_ID });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const controller = new StoreOwnershipController({
      createVerifiedEmailDirectory: () => verifiedEmailDirectory,
      linkingService: {
        linkPriorAcquisitions: vi
          .fn()
          .mockRejectedValue(new Error("Clerk is unreachable.")),
      },
    });

    // act
    const linked = controller.linkPriorAcquisitions(createArgs());

    // assert
    await expect(linked).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("swallows a failure to resolve the session at all", async () => {
    // arrange
    mocks.getAuth.mockRejectedValue(new Error("No Clerk middleware ran."));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const linkPriorAcquisitions = vi.fn();
    const controller = new StoreOwnershipController({
      createVerifiedEmailDirectory: () => verifiedEmailDirectory,
      linkingService: { linkPriorAcquisitions },
    });

    // act
    const linked = controller.linkPriorAcquisitions(createArgs());

    // assert
    await expect(linked).resolves.toBeUndefined();
    expect(linkPriorAcquisitions).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
