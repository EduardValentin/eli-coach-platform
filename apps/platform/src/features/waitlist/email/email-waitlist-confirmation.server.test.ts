import { describe, expect, it, vi } from "vitest";

import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { EmailWaitlistConfirmation } from "./email-waitlist-confirmation.server";

describe("EmailWaitlistConfirmation", () => {
  it.each(["reduced", "regular"] as const)(
    "sends the %s pricing confirmation to the waitlist entry",
    async (pricing) => {
      // arrange
      const productEmail = {
        provider: "resend",
        send: vi.fn().mockResolvedValue({
          kind: "sent",
          providerMessageId: "email_123",
        }),
      } satisfies ProductEmail;
      const confirmation = new EmailWaitlistConfirmation(productEmail, {
        contactEmail: "contact@evoa.fit",
        privacyEmail: "privacy@evoa.fit",
      });

      // act
      await confirmation.sendConfirmation({
        email: "eli@example.com",
        offer: {
          plan: "all-bundles",
          campaignSlug: "all-bundles-launch-1",
        },
        pricing,
      });
      const sentEmail = productEmail.send.mock.calls[0]?.[0];

      // assert
      expect(productEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "eli@example.com",
        }),
      );
      if (!sentEmail) {
        throw new Error("Expected a confirmation email to be sent.");
      }
      expect(sentEmail.subject.trim().length).toBeGreaterThan(0);
      expectFunctionalMailtoLinks(sentEmail.html, {
        contactEmail: "contact@evoa.fit",
        privacyEmail: "privacy@evoa.fit",
      });
      expectFunctionalMailtoLinks(sentEmail.text, {
        contactEmail: "contact@evoa.fit",
        privacyEmail: "privacy@evoa.fit",
      });
    },
  );

  it("selects distinct confirmation output for each pricing outcome", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue({
        kind: "sent",
        providerMessageId: "email_123",
      }),
    } satisfies ProductEmail;
    const confirmation = new EmailWaitlistConfirmation(productEmail, {
      contactEmail: "contact@evoa.fit",
      privacyEmail: "privacy@evoa.fit",
    });
    const offer = {
      plan: "all-bundles",
      campaignSlug: "all-bundles-launch-1",
    } as const;

    // act
    await confirmation.sendConfirmation({
      email: "reduced@example.com",
      offer,
      pricing: "reduced",
    });
    await confirmation.sendConfirmation({
      email: "regular@example.com",
      offer,
      pricing: "regular",
    });
    const reducedConfirmation = productEmail.send.mock.calls[0]?.[0];
    const regularConfirmation = productEmail.send.mock.calls[1]?.[0];

    // assert
    expect(productEmail.send).toHaveBeenCalledTimes(2);
    if (!reducedConfirmation || !regularConfirmation) {
      throw new Error("Expected both pricing confirmations to be sent.");
    }
    expect(reducedConfirmation.html).not.toBe(regularConfirmation.html);
    expect(reducedConfirmation.text).not.toBe(regularConfirmation.text);
  });
});

function extractMailtoUrls(content: string): URL[] {
  return [...content.matchAll(/mailto:[^\s"'<>]+/g)].map(
    (match) => new URL(match[0]),
  );
}

function expectFunctionalMailtoLinks(
  content: string,
  options: { contactEmail: string; privacyEmail: string },
): void {
  const mailtoUrls = extractMailtoUrls(content);
  const contactUrl = mailtoUrls.find(
    (url) => decodeURIComponent(url.pathname) === options.contactEmail,
  );
  const privacyUrl = mailtoUrls.find(
    (url) => decodeURIComponent(url.pathname) === options.privacyEmail,
  );

  expect(contactUrl).toBeDefined();
  expect(privacyUrl).toBeDefined();

  if (!privacyUrl) {
    throw new Error("Expected a privacy withdrawal link.");
  }

  expect(privacyUrl.search).not.toBe("");
  expect(privacyUrl.searchParams.get("subject")?.trim()).toMatch(/\S/);
}
