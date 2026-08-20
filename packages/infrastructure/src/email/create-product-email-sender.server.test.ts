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
    PRODUCT_EMAIL_FROM_ADDRESS: "contact@evoa.fit",
    PRODUCT_EMAIL_FROM_NAME: "Evoa",
    PRODUCT_EMAIL_PROVIDER: "resend",
    PRODUCT_EMAIL_REPLY_TO: "questions@evoa.fit",
    PUBLIC_APP_URL: "https://eli.example",
    RESEND_API_KEY: "re_123",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
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
        from: "Evoa <contact@evoa.fit>",
        replyTo: "questions@evoa.fit",
        to: "eli@example.com",
      }),
    );
  });

  it("uses a distinct sender identity per runtime environment configuration", async () => {
    // arrange
    resendSend.mockResolvedValue({ data: { id: "email-id" }, error: null });
    const sender = createProductEmailSender(
      createRuntimeEnvironment({
        PRODUCT_EMAIL_FROM_ADDRESS: "hello@test.evoa.fit",
        PRODUCT_EMAIL_FROM_NAME: "Eli Test Sender",
        PRODUCT_EMAIL_REPLY_TO: "support@test.evoa.fit",
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
        from: "Eli Test Sender <hello@test.evoa.fit>",
        replyTo: "support@test.evoa.fit",
      }),
    );
  });
});
