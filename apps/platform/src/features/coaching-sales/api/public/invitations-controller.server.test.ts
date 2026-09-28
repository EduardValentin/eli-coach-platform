import type { ResolveInvitationUseCase } from "@eli-coach-platform/domain/client-invitation";
import { describe, expect, it, vi } from "vitest";

import { createRequestArgs } from "~/server/test-support/request-args";

import { InvitationsController } from "./invitations-controller.server";

const TOKEN = "tok_live_invitation_token";
const CONTINUE_URL =
  "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket";

type Resolution = Awaited<ReturnType<ResolveInvitationUseCase["execute"]>>;

describe("InvitationsController resolution", () => {
  it("answers a live invitation with her email and the hosted sign-up link only, uncached", async () => {
    // arrange
    const { controller, resolveInvitation } = createController({
      state: "valid",
      email: "ana@example.com",
      continueUrl: CONTINUE_URL,
    });

    // act
    const response = await controller.resolve(
      invitationArgs(JSON.stringify({ token: TOKEN })),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      state: "valid",
      email: "ana@example.com",
      continueUrl: CONTINUE_URL,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(resolveInvitation).toHaveBeenCalledWith({ rawToken: TOKEN });
  });

  it("answers an invitation that cannot be used as unavailable and nothing more", async () => {
    // arrange
    const { controller } = createController({ state: "unavailable" });

    // act
    const response = await controller.resolve(
      invitationArgs(JSON.stringify({ token: TOKEN })),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "unavailable" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("never hands out a continue link that is not a web address", async () => {
    // arrange
    const { controller } = createController({
      state: "valid",
      email: "ana@example.com",
      continueUrl: "javascript:alert(1)",
    });

    // act
    const resolving = controller.resolve(
      invitationArgs(JSON.stringify({ token: TOKEN })),
    );

    // assert
    await expect(resolving).rejects.toThrow();
  });

  it.each([
    ["an empty token", JSON.stringify({ token: "" })],
    ["a token that is not a string", JSON.stringify({ token: 42 })],
    ["a missing token", JSON.stringify({})],
    ["an oversized token", JSON.stringify({ token: "a".repeat(300) })],
    ["a body that is not JSON", "token=abc"],
    ["an oversized body", JSON.stringify({ token: "a".repeat(2000) })],
  ])(
    "refuses %s without resolving anything or naming the token",
    async (_label, body) => {
      // arrange
      const { controller, resolveInvitation } = createController({
        state: "unavailable",
      });

      // act
      const response = await controller.resolve(invitationArgs(body));

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: "The invitation could not be read.",
      });
      expect(resolveInvitation).not.toHaveBeenCalled();
    },
  );
});

function createController(resolution: Resolution) {
  const resolveInvitation = vi.fn().mockResolvedValue(resolution);
  const controller = new InvitationsController({
    resolveInvitation: {
      execute: resolveInvitation,
    } as unknown as ResolveInvitationUseCase,
  });

  return { controller, resolveInvitation };
}

function invitationArgs(body: string) {
  return createRequestArgs({
    request: new Request(
      "https://attacker.example/api/coaching-sales/invitation",
      {
        body,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    ),
  });
}
