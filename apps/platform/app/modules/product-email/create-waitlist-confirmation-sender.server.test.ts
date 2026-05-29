import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { DisabledWaitlistConfirmationSender } from "./disabled-waitlist-confirmation-sender.server";
import { createWaitlistConfirmationSender } from "./create-waitlist-confirmation-sender.server";
import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

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
});
