import { describe, expect, it } from "vitest";

import { createPaymentLinkEmailContent } from "./payment-link-email.server";

const BASE_OPTIONS = {
  chooseUrl: "https://evoa.fit/eli-coach-platform/select-bundle?token=raw",
  contactEmail: "contact@evoa.fit",
  currentYear: 2026,
  firstName: "Ana",
  termsUrl: "https://evoa.fit/eli-coach-platform/terms",
};

describe("createPaymentLinkEmailContent", () => {
  it("uses the regular variant's subject and preview text", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.subject).toBe(
      "Your coaching bundles — pick the one that fits.",
    );
    expect(content.html).toContain(
      "<title>Your coaching bundles — pick the one that fits.</title>",
    );
  });

  it("uses the reduced variant's subject and preview text", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "reduced" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.subject).toBe("Your reduced prices are ready.");
    expect(content.html).toContain(
      "<title>Your reduced prices are ready.</title>",
    );
  });

  it("carries the regular variant's heading, subhead and opening in the html and text", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain("Let&#x27;s get you started.");
    expect(content.text).toContain("Let's get you started.");
    for (const copy of [
      "Three ways to work together. Pick the one that fits your months ahead.",
      "It was good to talk to you. Here are the three bundles we went through, so you can take your time and choose.",
    ]) {
      expect(content.html).toContain(copy);
      expect(content.text).toContain(copy);
    }
  });

  it("carries the reduced variant's heading, subhead and opening in the html and text", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "reduced" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain("Let&#x27;s get you started.");
    expect(content.text).toContain("Let's get you started.");
    expect(content.html).toContain(
      "These are your reduced prices, held for you.",
    );
    expect(content.text).toContain(
      "These are your reduced prices, held for you.",
    );
    expect(content.text).toContain(
      "It was good to talk to you. I've put your reduced pricing on all three bundles below, so you can take your time and choose.",
    );
    expect(content.html).toContain(
      "It was good to talk to you. I&#x27;ve put your reduced pricing on all three bundles below, so you can take your time and choose.",
    );
  });

  it("greets the client by her first name", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain("Hi Ana,");
    expect(content.text).toContain("Hi Ana,");
  });

  it("lists the three regular bundles in months order with their prices", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.text).toContain("1 month: €159 per month, €159 in total");
    expect(content.text).toContain("3 months: €149 per month, €447 in total");
    expect(content.text).toContain("6 months: €139 per month, €834 in total");
    expect(content.html).toContain("€159");
    expect(content.html).toContain("€447");
    expect(content.html).toContain("€834");
  });

  it("lists the three reduced bundles in months order with their prices", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "reduced" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.text).toContain("1 month: €139 per month, €139 in total");
    expect(content.text).toContain("3 months: €125 per month, €375 in total");
    expect(content.text).toContain("6 months: €119 per month, €714 in total");
    expect(content.html).toContain("€375");
    expect(content.html).toContain("€714");
  });

  it("links the choose-bundle button and the choose-bundle text line to the choose URL", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain(`href="${BASE_OPTIONS.chooseUrl}"`);
    expect(content.html).toContain("Choose your bundle");
    expect(content.text).toContain(
      `Choose your bundle: ${BASE_OPTIONS.chooseUrl}`,
    );
  });

  it("links the terms note to the terms URL in both html and text", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain(`href="${BASE_OPTIONS.termsUrl}"`);
    expect(content.html).toContain("Read the terms");
    expect(content.html).toContain(
      "Each bundle is a subscription that renews at its own length — every 1, 3 or 6 months — and our terms apply.",
    );
    expect(content.text).toContain(
      `Each bundle is a subscription that renews at its own length — every 1, 3 or 6 months — and our terms apply. Read the terms: ${BASE_OPTIONS.termsUrl}`,
    );
  });

  it("links the contact email as a mailto address", () => {
    // arrange
    const options = { ...BASE_OPTIONS, tier: "regular" as const };

    // act
    const content = createPaymentLinkEmailContent(options);

    // assert
    expect(content.html).toContain(
      `href="mailto:${BASE_OPTIONS.contactEmail}"`,
    );
    expect(content.text).toContain(
      `Questions? Reply to this email or write to ${BASE_OPTIONS.contactEmail}.`,
    );
  });
});
