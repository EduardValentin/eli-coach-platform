import { EVOA_FITNESS_PRIVACY_EMAIL } from "~/shared/brand";
import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { describe, expect, it } from "vitest";

import { createWaitlistConfirmationAdapter } from "./create-waitlist-confirmation-adapter.server";
import { EmailWaitlistConfirmationAdapter } from "./email-waitlist-confirmation-adapter.server";

describe("createWaitlistConfirmationAdapter", () => {
  it("returns the email waitlist confirmation", () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();

    // act
    const waitlistConfirmationPort = createWaitlistConfirmationAdapter(
      inMemoryProductEmailAdapter,
      {
        contactEmail: "contact@evoa.fit",
        privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
      },
    );

    // assert
    expect(waitlistConfirmationPort).toBeInstanceOf(
      EmailWaitlistConfirmationAdapter,
    );
  });

  it("uses the stable privacy contact while retaining Reply-To for questions", async () => {
    // arrange
    const inMemoryProductEmailAdapter = new InMemoryProductEmailAdapter();
    const waitlistConfirmationPort = createWaitlistConfirmationAdapter(
      inMemoryProductEmailAdapter,
      {
        contactEmail: "questions@evoa.fit",
        privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
      },
    );

    // act
    await waitlistConfirmationPort.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    const sentEmail = inMemoryProductEmailAdapter.sent[0];

    // assert
    expect(inMemoryProductEmailAdapter.sent).toHaveLength(1);
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
