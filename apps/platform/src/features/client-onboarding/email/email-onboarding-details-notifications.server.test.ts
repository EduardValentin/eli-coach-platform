import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it, vi } from "vitest";

import { EmailOnboardingDetailsNotifications } from "./email-onboarding-details-notifications.server";

const REQUEST_ID = "0b5f2f0e-3a1c-4c47-9a57-8f2d7f1e6a01";
const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

function detailsRequestMessage() {
  return {
    requestId: REQUEST_ID,
    clientId: CLIENT_ID,
    email: "ana@example.com",
    firstName: "Ana",
  };
}

function createProductEmail(result: Awaited<ReturnType<ProductEmail["send"]>>) {
  return {
    provider: "memory",
    send: vi.fn().mockResolvedValue(result),
  } satisfies ProductEmail;
}

function createNotifications(productEmail: ProductEmail, appBasePath = "/app") {
  return new EmailOnboardingDetailsNotifications(productEmail, {
    appBasePath,
    clock: { now: () => new Date("2026-09-29T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailOnboardingDetailsNotifications", () => {
  it("emails the client keyed by the request, with the coach's contact address as the reply-to", async () => {
    // arrange
    const productEmail = createProductEmail({
      kind: "sent",
      providerMessageId: "msg_1",
    });
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.sendDetailsRequest(
      detailsRequestMessage(),
    );

    // assert
    expect(result).toBe("sent");
    expect(productEmail.send).toHaveBeenCalledTimes(1);
    expect(productEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@example.com",
        idempotencyKey: `onboarding-details:${REQUEST_ID}`,
        replyTo: "contact@evoa.fit",
        subject: "Eli needs a few more details",
      }),
    );
  });

  it("links to her client portal under the app base path", async () => {
    // arrange
    const productEmail = createProductEmail({
      kind: "sent",
      providerMessageId: "msg_1",
    });
    const notifications = createNotifications(productEmail, "/app");
    const expectedUrl = "https://evoa.fit/app/client";

    // act
    await notifications.sendDetailsRequest(detailsRequestMessage());

    // assert
    const [command] = productEmail.send.mock.calls[0] ?? [];

    expect(command.html).toContain(`href="${expectedUrl}"`);
    expect(command.text).toContain(`Answer now: ${expectedUrl}`);
    expect(command.text).toContain("© 2026 Evoa Fitness");
  });

  it("never carries the request or client id in the message body", async () => {
    // arrange
    const productEmail = createProductEmail({
      kind: "sent",
      providerMessageId: "msg_1",
    });
    const notifications = createNotifications(productEmail);

    // act
    await notifications.sendDetailsRequest(detailsRequestMessage());

    // assert
    const [command] = productEmail.send.mock.calls[0] ?? [];

    for (const body of [command.html, command.text]) {
      expect(body).not.toContain(REQUEST_ID);
      expect(body).not.toContain(CLIENT_ID);
    }
  });

  it.each([
    ["rejected", { kind: "rejected", reason: "invalid_to" }],
    ["left unconfirmed", { kind: "unconfirmed" }],
  ] as const)(
    "reports a send the provider %s as failed",
    async (_label, outcome) => {
      // arrange
      const notifications = createNotifications(createProductEmail(outcome));

      // act
      const result = await notifications.sendDetailsRequest(
        detailsRequestMessage(),
      );

      // assert
      expect(result).toBe("failed");
    },
  );
});
