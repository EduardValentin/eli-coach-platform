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
      RESEND_API_KEY: "re_123",
    });

    // act
    const sender = createWaitlistConfirmationSender({ runtimeEnvironment });

    // assert
    expect(sender).toBeInstanceOf(WaitlistConfirmationEmailSender);
  });

  it("uses the stable privacy contact for withdrawal while retaining Reply-To for questions", async () => {
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
      RESEND_API_KEY: "re_123",
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

    // assert
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          `mailto:${EVOA_FITNESS_PRIVACY_EMAIL}?subject=Unsubscribe%20from%20Eli%20waitlist%20emails`,
        ),
        replyTo: "questions@elipersonaltrainer.com",
        text: expect.stringContaining(
          `Unsubscribe: mailto:${EVOA_FITNESS_PRIVACY_EMAIL}?subject=Unsubscribe%20from%20Eli%20waitlist%20emails`,
        ),
      }),
    );
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("mailto:questions@elipersonaltrainer.com"),
        text: expect.stringContaining(
          "Questions? Reply to this email or write to questions@elipersonaltrainer.com.",
        ),
      }),
    );
  });
});
