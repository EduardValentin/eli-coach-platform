import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { describe, expect, it, vi } from "vitest";

import { DisabledWaitlistConfirmationSender } from "./disabled-waitlist-confirmation-sender.server";
import { createWaitlistConfirmationSender } from "./create-waitlist-confirmation-sender.server";
import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    readonly emails = {
      send: resendSend,
    };
  },
}));

describe("createWaitlistConfirmationSender", () => {
  it("uses a disabled sender when product email delivery is disabled", () => {
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
    const sender = createWaitlistConfirmationSender({ runtimeEnvironment });

    // assert
    expect(sender).toBeInstanceOf(DisabledWaitlistConfirmationSender);
  });

  it("uses the product email waitlist sender when Resend is configured", () => {
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
    const sender = createWaitlistConfirmationSender({ runtimeEnvironment });

    // assert
    expect(sender).toBeInstanceOf(WaitlistConfirmationEmailSender);
  });

  it("uses the stable privacy contact while retaining Reply-To for questions", async () => {
    // arrange
    resendSend.mockResolvedValue({
      data: {
        id: "email-id",
      },
      error: null,
    });
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
    const sender = createWaitlistConfirmationSender({ runtimeEnvironment });

    // act
    await sender.sendConfirmation({
      email: "eli@example.com",
      offer: {
        plan: "all-bundles",
        campaignSlug: "all-bundles-launch-1",
      },
      pricing: "reduced",
    });

    const sentEmail = resendSend.mock.calls[0]?.[0];

    // assert
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "questions@elipersonaltrainer.com",
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
