import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it, vi } from "vitest";

import { createProductEmailSender } from "./create-product-email-sender.server";

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    readonly emails = {
      send: resendSend,
    };
  },
}));

function createRuntimeEnvironment(overrides?: NodeJS.ProcessEnv) {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
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
    ...overrides,
  });
}

describe("createProductEmailSender", () => {
  it("wires the runtime environment's Resend configuration into the returned sender", async () => {
    // arrange
    resendSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
    const sender = createProductEmailSender(createRuntimeEnvironment());

    // act
    await sender.sendEmail({
      html: "<p>Hi</p>",
      subject: "Subject",
      text: "Hi",
      to: "eli@example.com",
    });

    // assert
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Eli Personal Trainer <contact@elipersonaltrainer.com>",
        replyTo: "questions@elipersonaltrainer.com",
        to: "eli@example.com",
      }),
    );
  });

  it("uses a distinct sender identity per runtime environment configuration", async () => {
    // arrange
    resendSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
    const sender = createProductEmailSender(
      createRuntimeEnvironment({
        PRODUCT_EMAIL_FROM_ADDRESS: "hello@test.elipersonaltrainer.com",
        PRODUCT_EMAIL_FROM_NAME: "Eli Test Sender",
        PRODUCT_EMAIL_REPLY_TO: "support@test.elipersonaltrainer.com",
      }),
    );

    // act
    await sender.sendEmail({
      html: "<p>Hi</p>",
      subject: "Subject",
      text: "Hi",
      to: "eli@example.com",
    });

    // assert
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Eli Test Sender <hello@test.elipersonaltrainer.com>",
        replyTo: "support@test.elipersonaltrainer.com",
      }),
    );
  });
});
