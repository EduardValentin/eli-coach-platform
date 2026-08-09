import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { describe, expect, it, vi } from "vitest";

import { createWaitlistConfirmationService } from "./create-waitlist-confirmation-service.server";
import { DisabledWaitlistConfirmationService } from "./disabled-waitlist-confirmation-service.server";
import { EmailWaitlistConfirmationService } from "./email-waitlist-confirmation-service.server";

// The feature only ever receives a `ProductEmailSender` port — the vendor
// client (Resend) is constructed and wired by
// `@eli-coach-platform/infrastructure`'s `createProductEmailSender`, which
// has its own coverage for that wiring. This mocks the port boundary the
// feature actually depends on, rather than reaching past it into the
// vendor SDK.
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@eli-coach-platform/infrastructure/email/server", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@eli-coach-platform/infrastructure/email/server")
  >();

  return {
    ...actual,
    createProductEmailSender: () => ({ sendEmail }),
  };
});

describe("createWaitlistConfirmationService", () => {
  it("uses a disabled service when product email delivery is disabled", () => {
    // arrange
    const runtimeEnvironment = loadRuntimeEnvironment({
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "test",
      NODE_ENV: "test",
      STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
    });

    // act
    const service = createWaitlistConfirmationService({ runtimeEnvironment });

    // assert
    expect(service).toBeInstanceOf(DisabledWaitlistConfirmationService);
  });

  it("uses the product email waitlist service when Resend is configured", () => {
    // arrange
    const runtimeEnvironment = loadRuntimeEnvironment({
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "local",
      NODE_ENV: "development",
      PRODUCT_EMAIL_FROM_ADDRESS: "contact@elipersonaltrainer.com",
      PRODUCT_EMAIL_FROM_NAME: "Eli Personal Trainer",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "contact@elipersonaltrainer.com",
      PUBLIC_APP_URL: "https://eli.example",
      RESEND_API_KEY: "re_123",
      STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
    });

    // act
    const service = createWaitlistConfirmationService({ runtimeEnvironment });

    // assert
    expect(service).toBeInstanceOf(EmailWaitlistConfirmationService);
  });

  it("uses the stable privacy contact while retaining Reply-To for questions", async () => {
    // arrange
    sendEmail.mockResolvedValue({ providerMessageId: "email-id" });
    const runtimeEnvironment = loadRuntimeEnvironment({
      DATABASE_HOST: "127.0.0.1",
      DATABASE_NAME: "eli_coach_platform",
      DATABASE_PASSWORD: "app-password",
      DATABASE_PORT: "55437",
      DATABASE_USER: "app-user",
      ENVIRONMENT: "local",
      NODE_ENV: "development",
      PRODUCT_EMAIL_FROM_ADDRESS: "contact@elipersonaltrainer.com",
      PRODUCT_EMAIL_FROM_NAME: "Eli Personal Trainer",
      PRODUCT_EMAIL_PROVIDER: "resend",
      PRODUCT_EMAIL_REPLY_TO: "questions@elipersonaltrainer.com",
      PUBLIC_APP_URL: "https://eli.example",
      RESEND_API_KEY: "re_123",
      STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
    });
    const service = createWaitlistConfirmationService({ runtimeEnvironment });

    // act
    await service.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    const sentEmail = sendEmail.mock.calls[0]?.[0];

    // assert
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "eli@example.com",
      }),
    );
    expect(sentEmail).toEqual(
      expect.objectContaining({
        html: expect.any(String),
        text: expect.any(String),
      }),
    );
    if (!sentEmail) {
      throw new Error("Expected a confirmation email to be sent.");
    }
    expectFunctionalMailtoLinks(sentEmail.html, {
      contactEmail: "questions@elipersonaltrainer.com",
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    });
    expectFunctionalMailtoLinks(sentEmail.text, {
      contactEmail: "questions@elipersonaltrainer.com",
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
