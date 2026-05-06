// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { useFetcher, type FetcherWithComponents } from "react-router";
import { beforeEach, vi } from "vitest";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

import { WaitlistEmailForm } from "./waitlist-email-form";
import { launchWaitlistConfetti } from "./waitlist-confetti";

vi.mock("./waitlist-confetti", () => ({
  launchWaitlistConfetti: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: vi.fn(),
  };
});

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

const TURNSTILE_BOT_DETECTION = {
  provider: "turnstile",
  siteKey: "turnstile-site-key",
} satisfies BotDetectionConfig;

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

beforeEach(() => {
  vi.mocked(launchWaitlistConfetti).mockClear();
});

function createFetcher(fetcher?: Partial<FetcherWithComponents<WaitlistJoinResponse>>) {
  return {
    Form: "form",
    data: undefined,
    state: "idle",
    submit: vi.fn(),
    ...fetcher,
  } as unknown as FetcherWithComponents<WaitlistJoinResponse>;
}

function renderForm(
  fetcherOverrides?: Partial<FetcherWithComponents<WaitlistJoinResponse>>,
  options?: {
    botDetectionConfig?: BotDetectionConfig;
    spotsRemaining?: number | null;
  },
) {
  const fetcher = createFetcher(fetcherOverrides);
  vi.mocked(useFetcher).mockReturnValue(
    fetcher as unknown as ReturnType<typeof useFetcher>,
  );

  return {
    fetcher,
    ...render(
      <WaitlistEmailForm
        botDetectionConfig={options?.botDetectionConfig ?? STATIC_BOT_DETECTION}
        spotsRemaining={options?.spotsRemaining ?? 10}
        variant="dark"
      />,
    ),
  };
}

function getBotDetectionResponseInput() {
  return screen.getByTestId("bot-detection-response");
}

describe("WaitlistEmailForm", () => {
  it("disables submit while the email is empty", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("enables submit after entering an email", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    expect(screen.getByRole("button", { name: "Join the list" })).toBeEnabled();
  });

  it("switches to a notify form when reduced pricing spots are full", async () => {
    const user = userEvent.setup();

    renderForm(undefined, { spotsRemaining: 0 });

    expect(
      screen.queryByText("All 10 spots have been claimed", { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    expect(screen.getByRole("button", { name: "Notify me" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("shows the CTA loading state while submitting", () => {
    renderForm({ state: "submitting" });

    expect(screen.getByRole("button", { name: "Joining the list" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("shows success state from fetcher data", () => {
    renderForm({
      data: {
        pricing: "reduced",
        success: true,
        spotsRemaining: 9,
      },
    });

    expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
  });

  it("shows success with confetti and without a toast", () => {
    renderForm({
      data: {
        pricing: "reduced",
        success: true,
        spotsRemaining: 9,
      },
    });

    expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not launch confetti after regular pricing signup", () => {
    renderForm(
      {
        data: {
          pricing: "regular",
          success: true,
          spotsRemaining: 0,
        },
      },
      { spotsRemaining: 0 },
    );

    expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    expect(launchWaitlistConfetti).not.toHaveBeenCalled();
  });

  it("uses app-controlled email validation so inline errors can be styled consistently", () => {
    renderForm();

    const input = screen.getByLabelText("Email address");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input.closest("form")).toHaveAttribute("novalidate");
  });

  it("renders the configured invisible Turnstile widget inside the waitlist form", () => {
    renderForm(undefined, { botDetectionConfig: TURNSTILE_BOT_DETECTION });

    const widget = screen.getByTestId("bot-detection-widget");

    expect(widget).toHaveAttribute("data-sitekey", "turnstile-site-key");
    expect(widget).toHaveAttribute("data-action", "waitlist_join");
    expect(widget).toHaveAttribute("data-size", "invisible");
    expect(widget).toHaveAttribute("data-response-field-name", "cf-turnstile-response");
    expect(widget?.closest("form")).toBe(screen.getByLabelText("Email address").closest("form"));
    expect(getBotDetectionResponseInput()).toHaveAttribute("type", "hidden");
  });

  it("prepares the static local bot detection token", async () => {
    renderForm();

    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
  });

  it("submits through bot detection and clears the used token", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    renderForm({ submit });

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    expect(submit).toHaveBeenCalledTimes(1);
    const [formData, submitOptions] = submit.mock.calls[0] as [
      FormData,
      { action: string; method: string },
    ];
    expect(formData.get("email")).toBe("eli@example.com");
    expect(formData.get("cf-turnstile-response")).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
    expect(submitOptions).toEqual({
      action: "/api/waitlist",
      method: "post",
    });
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue("");
    });
  });

  it("resets bot detection after a server error before the next retry", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const { fetcher, rerender } = renderForm({ submit });
    const serverErrorResponse: WaitlistJoinResponse = {
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    };

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue("");
    });

    fetcher.data = serverErrorResponse;
    rerender(
      <WaitlistEmailForm
        botDetectionConfig={STATIC_BOT_DETECTION}
        spotsRemaining={10}
        variant="dark"
      />,
    );

    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("renders invalid email errors as an inline alert on dark surfaces", () => {
    renderForm({
      data: {
        success: false,
        error: {
          code: "invalid_email",
          message: "Unable to process waitlist signup.",
        },
      },
    });

    const alert = screen.getByRole("alert");
    const input = screen.getByLabelText("Email address");

    expect(alert).toHaveClass("text-feedback-danger-on-inverted");
    expect(alert).toHaveTextContent("That email doesn't look quite right — give it one more look.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "waitlist-email-error");
  });

  it("renders duplicate signup errors from client-owned copy", () => {
    renderForm({
      data: {
        success: false,
        error: {
          code: "already_registered",
          message: "Unable to process waitlist signup.",
        },
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Good news — you're already on the list. We'll be in touch when doors open.",
    );
  });

  it("renders server errors with a support email fallback", () => {
    renderForm({
      data: {
        success: false,
        error: {
          code: "server_error",
          message: "Unable to process waitlist signup.",
        },
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong on our end. Try again in a moment",
    );
    expect(screen.getByRole("link", { name: ELI_COACH_CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${ELI_COACH_CONTACT_EMAIL}`,
    );
  });
});
