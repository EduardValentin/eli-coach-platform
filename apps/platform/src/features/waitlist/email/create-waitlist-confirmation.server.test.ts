import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { createWaitlistConfirmation } from "./create-waitlist-confirmation.server";
import { EmailWaitlistConfirmation } from "./email-waitlist-confirmation.server";

describe("createWaitlistConfirmation", () => {
  it("returns the email waitlist confirmation", () => {
    // arrange
    const productEmail = new InMemoryProductEmail();

    // act
    const confirmation = createWaitlistConfirmation(productEmail, {
      contactEmail: "contact@evoa.fit",
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    });

    // assert
    expect(confirmation).toBeInstanceOf(EmailWaitlistConfirmation);
  });

  it("uses the stable privacy contact while retaining Reply-To for questions", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const confirmation = createWaitlistConfirmation(productEmail, {
      contactEmail: "questions@evoa.fit",
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    });

    // act
    await confirmation.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    const sentEmail = productEmail.sent[0];

    // assert
    expect(productEmail.sent).toHaveLength(1);
    expect(sentEmail).toEqual(
      expect.objectContaining({
        to: "eli@example.com",
        html: expect.any(String),
        text: expect.any(String),
      }),
    );
    if (!sentEmail) {
      throw new Error("Expected a confirmation email to be sent.");
    }
    expectFunctionalMailtoLinks(sentEmail.html, {
      contactEmail: "questions@evoa.fit",
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    });
    expectFunctionalMailtoLinks(sentEmail.text, {
      contactEmail: "questions@evoa.fit",
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    });
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
