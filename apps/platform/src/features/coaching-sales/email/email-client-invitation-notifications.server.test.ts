import type { ClientInvitationMessage } from "@eli-coach-platform/domain/client-invitation";
import {
  InMemoryProductEmail,
  type ProductEmail,
} from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it, vi } from "vitest";

import { EmailClientInvitationNotifications } from "./email-client-invitation-notifications.server";

const RAW_TOKEN = "raw-invitation-token";

function invitationMessage(): ClientInvitationMessage {
  return {
    invitationId: "5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    email: "ana@example.com",
    firstName: "Ana",
    rawToken: RAW_TOKEN,
    expiresAt: new Date("2026-11-20T10:00:00.000Z"),
  };
}

function createNotifications(productEmail: ProductEmail) {
  return new EmailClientInvitationNotifications(productEmail, {
    appBasePath: "/eli-coach-platform",
    clock: { now: () => new Date("2026-10-21T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailClientInvitationNotifications", () => {
  it("emails the paid client with the coach's contact address as the reply-to", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.sendInvitation(invitationMessage());

    // assert
    expect(result).toBe("sent");
    expect(productEmail.sent).toHaveLength(1);
    expect(productEmail.sent[0]?.to).toBe("ana@example.com");
    expect(productEmail.sent[0]?.replyTo).toBe("contact@evoa.fit");
    expect(productEmail.sent[0]?.subject).toBe(
      "Your place is booked — create your account.",
    );
  });

  it("keys the send by the invitation id so a retry cannot double-send", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.sendInvitation(invitationMessage());

    // assert
    expect(productEmail.sent[0]?.idempotencyKey).toBe(
      "client-invitation:5b1c7a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    );
  });

  it("links to the invitation page under the app base path with the token in the fragment", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);
    const expectedUrl = `https://evoa.fit/eli-coach-platform/invitation#${RAW_TOKEN}`;

    // act
    await notifications.sendInvitation(invitationMessage());

    // assert
    const sent = productEmail.sent[0];

    expect(sent?.html).toContain(`href="${expectedUrl}"`);
    expect(sent?.text).toContain(`Create your account: ${expectedUrl}`);
    expect(sent?.text).toContain("© 2026 Evoa Fitness");
  });

  it("never exposes the raw token outside the invitation link", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.sendInvitation(invitationMessage());

    // assert
    const sent = productEmail.sent[0];

    expect(sent?.html.split(RAW_TOKEN)).toHaveLength(2);
    expect(sent?.text.split(RAW_TOKEN)).toHaveLength(2);
  });

  it.each([
    ["rejected", { kind: "rejected", reason: "invalid_to" }],
    ["left unconfirmed", { kind: "unconfirmed" }],
  ] as const)(
    "reports a send the provider %s as failed, so the coach can send it again",
    async (_label, outcome) => {
      // arrange
      const productEmail = {
        provider: "resend",
        send: vi.fn().mockResolvedValue(outcome),
      } satisfies ProductEmail;
      const notifications = createNotifications(productEmail);

      // act
      const result = await notifications.sendInvitation(invitationMessage());

      // assert
      expect(result).toBe("failed");
    },
  );
});
