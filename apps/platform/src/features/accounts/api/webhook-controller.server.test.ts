import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountRepository } from "@eli-coach-platform/domain";

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
}));

// @clerk/react-router/webhooks is the third-party webhook-verification SDK
// boundary (not our own API layer), so mocking it here is the accepted seam
// per AGENTS.md.
vi.mock("@clerk/react-router/webhooks", () => ({
  verifyWebhook: mocks.verifyWebhook,
}));

import { AccountWebhookController } from "./webhook-controller.server";

const SIGNING_SECRET = "whsec_test1234567890abcdef";
const CLERK_USER_ID = "user_12345";

describe("AccountWebhookController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 and never attempts verification when no signing secret is configured", async () => {
    // arrange
    const softDeleteByAuthSubjectId = vi.fn();
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      undefined,
    );
    const request = createWebhookRequest();

    // act
    const response = await controller.handleClerkEvent(request);

    // assert
    expect(response.status).toBe(503);
    expect(mocks.verifyWebhook).not.toHaveBeenCalled();
    expect(softDeleteByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    // arrange
    mocks.verifyWebhook.mockRejectedValue(new Error("bad signature"));
    const softDeleteByAuthSubjectId = vi.fn();
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );
    const request = createWebhookRequest();

    // act
    const response = await controller.handleClerkEvent(request);

    // assert
    expect(response.status).toBe(400);
    expect(mocks.verifyWebhook).toHaveBeenCalledWith(request, {
      signingSecret: SIGNING_SECRET,
    });
    expect(softDeleteByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("soft-deletes the account and returns 200 for a verified user.deleted event", async () => {
    // arrange
    mocks.verifyWebhook.mockResolvedValue(
      createUserDeletedEvent(CLERK_USER_ID),
    );
    const softDeleteByAuthSubjectId = vi.fn().mockResolvedValue(undefined);
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );
    const request = createWebhookRequest();

    // act
    const response = await controller.handleClerkEvent(request);

    // assert
    expect(response.status).toBe(200);
    expect(softDeleteByAuthSubjectId).toHaveBeenCalledWith(CLERK_USER_ID);
  });

  it("returns 200 without touching the repository for any other verified event type", async () => {
    // arrange
    mocks.verifyWebhook.mockResolvedValue({
      data: { id: CLERK_USER_ID },
      event_attributes: { http_request: { client_ip: "", user_agent: "" } },
      object: "event",
      type: "user.created",
    });
    const softDeleteByAuthSubjectId = vi.fn();
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );
    const request = createWebhookRequest();

    // act
    const response = await controller.handleClerkEvent(request);

    // assert
    expect(response.status).toBe(200);
    expect(softDeleteByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("returns 400 for a verified user.deleted event with no Clerk user id", async () => {
    // arrange
    mocks.verifyWebhook.mockResolvedValue(createUserDeletedEvent(undefined));
    const softDeleteByAuthSubjectId = vi.fn();
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );
    const request = createWebhookRequest();

    // act
    const response = await controller.handleClerkEvent(request);

    // assert
    expect(response.status).toBe(400);
    expect(softDeleteByAuthSubjectId).not.toHaveBeenCalled();
  });

  it("lets a repository fault surface as an uncaught error rather than a 400, so Clerk retries delivery", async () => {
    // arrange
    mocks.verifyWebhook.mockResolvedValue(
      createUserDeletedEvent(CLERK_USER_ID),
    );
    const repositoryFault = new Error("connection reset");
    const softDeleteByAuthSubjectId = vi.fn().mockRejectedValue(repositoryFault);
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );
    const request = createWebhookRequest();

    // act
    const handleClerkEvent = () => controller.handleClerkEvent(request);

    // assert
    await expect(handleClerkEvent).rejects.toThrow(repositoryFault);
  });

  it("still returns 200 when the same deletion is delivered a second time", async () => {
    // arrange
    mocks.verifyWebhook.mockResolvedValue(
      createUserDeletedEvent(CLERK_USER_ID),
    );
    // The repository's soft-delete is idempotent by construction, so a
    // repeated delivery resolves the same way as the first.
    const softDeleteByAuthSubjectId = vi.fn().mockResolvedValue(undefined);
    const controller = new AccountWebhookController(
      createAccountRepository({ softDeleteByAuthSubjectId }),
      SIGNING_SECRET,
    );

    // act
    const firstResponse = await controller.handleClerkEvent(
      createWebhookRequest(),
    );
    const secondResponse = await controller.handleClerkEvent(
      createWebhookRequest(),
    );

    // assert
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(softDeleteByAuthSubjectId).toHaveBeenCalledTimes(2);
    expect(softDeleteByAuthSubjectId).toHaveBeenNthCalledWith(
      1,
      CLERK_USER_ID,
    );
    expect(softDeleteByAuthSubjectId).toHaveBeenNthCalledWith(
      2,
      CLERK_USER_ID,
    );
  });
});

function createAccountRepository(
  overrides: Partial<AccountRepository>,
): AccountRepository {
  return {
    findByAuthSubjectId: vi.fn(),
    insert: vi.fn(),
    softDeleteByAuthSubjectId: vi.fn(),
    ...overrides,
  };
}

function createUserDeletedEvent(id: string | undefined) {
  return {
    data: { deleted: true, id, object: "user" },
    event_attributes: { http_request: { client_ip: "", user_agent: "" } },
    object: "event",
    type: "user.deleted",
  };
}

function createWebhookRequest(): Request {
  return new Request("https://eli.example/api/clerk/webhooks", {
    body: JSON.stringify({ data: {}, object: "event", type: "user.deleted" }),
    headers: {
      "svix-id": "msg_1",
      "svix-signature": "v1,signature",
      "svix-timestamp": "1700000000",
    },
    method: "POST",
  });
}
