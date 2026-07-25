// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { createTestQueryClient, createTestQueryClientWrapper } from "~/test/query-client";

import { WaitlistEmailForm } from "./waitlist-email-form";
import { launchWaitlistConfetti } from "./waitlist-confetti";
import { WAITLIST_API_URL } from "./waitlist-query";

vi.mock("./waitlist-confetti", () => ({
  launchWaitlistConfetti: vi.fn(),
}));

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

const TURNSTILE_BOT_DETECTION = {
  provider: "turnstile",
  siteKey: "turnstile-site-key",
} satisfies BotDetectionConfig;

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.resetAllMocks();
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.mocked(launchWaitlistConfetti).mockClear();
});

function renderForm(options?: {
  botDetectionConfig?: BotDetectionConfig;
  spotsRemaining?: number | null;
  variant?: "dark" | "light";
}) {
  const queryClient = createTestQueryClient();

  return render(
    <MemoryRouter>
      <WaitlistEmailForm
        botDetectionConfig={options?.botDetectionConfig ?? STATIC_BOT_DETECTION}
        spotsRemaining={options?.spotsRemaining ?? 10}
        variant={options?.variant ?? "dark"}
      />
    </MemoryRouter>,
    { wrapper: createTestQueryClientWrapper(queryClient) },
  );
}

function getBotDetectionResponseInput() {
  return screen.getByTestId("bot-detection-response");
}

function mockWaitlistSubmit(
  response: Parameters<typeof HttpResponse.json>[0],
  init?: ResponseInit,
) {
  server.use(http.post(WAITLIST_API_URL, () => HttpResponse.json(response, init)));
}

async function typeEmailAndSubmit() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Email address"), "eli@example.com");
  await waitFor(() => {
    expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
  });
  await user.click(screen.getByRole("button", { name: "Join the list" }));
}

describe("WaitlistEmailForm", () => {
  it.each(["dark", "light"] as const)(
    "discloses marketing consent before the %s form controls without requiring a checkbox",
    (variant) => {
      // arrange
      const approvedNotice =
        "By joining the waitlist, you agree that Evoa Fitness may email you about coaching availability, launches and news, digital resources, fitness and nutrition content, and occasional offers. You can withdraw your consent at any time by emailing privacy@evoa.fit. See our Privacy Policy.";

      // act
      const { container } = renderForm({ variant });
      const notice = Array.from(container.querySelectorAll("p")).find(
        (paragraph) => paragraph.textContent === approvedNotice,
      );
      const emailInput = screen.getByLabelText("Email address");
      const submitButton = screen.getByRole("button", { name: "Join the list" });

      // assert
      expect(notice).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "privacy@evoa.fit" })).toHaveAttribute(
        "href",
        "mailto:privacy@evoa.fit",
      );
      expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
        "href",
        "/privacy",
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(notice?.compareDocumentPosition(emailInput)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(notice?.compareDocumentPosition(submitButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
  );

  it("disables submit while the email is empty", () => {
    // arrange
    renderForm();

    // act
    const submitButton = screen.getByRole("button", { name: "Join the list" });

    // assert
    expect(submitButton).toBeDisabled();
  });

  it("enables submit after entering an email", async () => {
    // arrange
    const user = userEvent.setup();

    renderForm();

    // act
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    // assert
    expect(screen.getByRole("button", { name: "Join the list" })).toBeEnabled();
  });

  it("switches to a notify form when reduced pricing spots are full", async () => {
    // arrange
    const user = userEvent.setup();

    renderForm({ spotsRemaining: 0 });

    // act
    const claimedCopy = screen.queryByText("All 10 spots have been claimed", { exact: false });
    const notifyButton = screen.getByRole("button", { name: "Notify me" });
    const notifyButtonWasInitiallyDisabled = notifyButton.hasAttribute("disabled");

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    // assert
    expect(claimedCopy).not.toBeInTheDocument();
    expect(notifyButtonWasInitiallyDisabled).toBe(true);
    expect(screen.getByRole("button", { name: "Notify me" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("shows the CTA loading state while submitting", async () => {
    // arrange
    let resolveSubmit: () => void = () => {};
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const user = userEvent.setup();
    server.use(
      http.post(WAITLIST_API_URL, async () => {
        await submitPromise;

        return HttpResponse.json({
          success: true,
        });
      }),
    );

    renderForm();

    // act
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    // assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Joining the list" })).toBeDisabled();
    });

    resolveSubmit();
  });

  it("shows success state from the waitlist API response", async () => {
    // arrange
    mockWaitlistSubmit({
      success: true,
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
  });

  it("shows success with confetti and without a toast after a generic signup response", async () => {
    // arrange
    mockWaitlistSubmit({
      success: true,
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    await waitFor(() => {
      expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("launches confetti after a generic signup response from a full waitlist", async () => {
    // arrange
    mockWaitlistSubmit({
      success: true,
    });

    renderForm({ spotsRemaining: 0 });
    const user = userEvent.setup();

    // act
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Notify me" }));

    // assert
    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
  });

  it("uses app-controlled email validation so inline errors can be styled consistently", () => {
    // arrange
    renderForm();

    // act
    const input = screen.getByLabelText("Email address");

    // assert
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input.closest("form")).toHaveAttribute("novalidate");
  });

  it("uses the branded focus ring without the shared outer outline", () => {
    // arrange
    renderForm({ variant: "light" });

    // act
    const input = screen.getByLabelText("Email address");

    // assert
    expect(input).toHaveClass(
      "focus-visible:border-brand-primary",
      "focus-visible:ring-2",
      "focus-visible:ring-brand-primary/30",
      "focus-visible:!outline-none",
    );
  });

  it("renders the configured invisible Turnstile widget inside the waitlist form", () => {
    // arrange
    renderForm({ botDetectionConfig: TURNSTILE_BOT_DETECTION });

    // act
    const widget = screen.getByTestId("bot-detection-widget");

    // assert
    expect(widget).toHaveAttribute("data-sitekey", "turnstile-site-key");
    expect(widget).toHaveAttribute("data-action", "waitlist_join");
    expect(widget).toHaveAttribute("data-size", "invisible");
    expect(widget).toHaveAttribute("data-response-field-name", "cf-turnstile-response");
    expect(widget?.closest("form")).toBe(screen.getByLabelText("Email address").closest("form"));
    expect(getBotDetectionResponseInput()).toHaveAttribute("type", "hidden");
  });

  it("prepares the static local bot detection token", async () => {
    // arrange
    renderForm();

    // act
    const responseInput = getBotDetectionResponseInput();

    // assert
    await waitFor(() => {
      expect(responseInput).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
  });

  it("submits only the email and bot detection token through the waitlist API", async () => {
    // arrange
    let submittedValues: Record<string, FormDataEntryValue> = {};
    server.use(
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedValues = Object.fromEntries(formData.entries());

        return HttpResponse.json({
          success: true,
        });
      }),
    );

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    await waitFor(() => {
      expect(submittedValues).toEqual({
        "cf-turnstile-response": TURNSTILE_TEST_RESPONSE_TOKEN,
        email: "eli@example.com",
      });
    });
  });

  it("resets bot detection after a server error before the next retry", async () => {
    // arrange
    const user = userEvent.setup();
    let submitCount = 0;
    server.use(
      http.post(WAITLIST_API_URL, () => {
        submitCount += 1;

        if (submitCount === 1) {
          return HttpResponse.json({
            success: false,
            error: {
              code: "server_error",
              message: "Unable to process waitlist signup.",
            },
          });
        }

        return HttpResponse.json({
          success: true,
        });
      }),
    );

    renderForm();

    // act
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong on our end. Try again in a moment",
      );
    });
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });

    await user.click(screen.getByRole("button", { name: "Join the list" }));

    // assert
    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    expect(submitCount).toBe(2);
  });

  it("renders invalid email errors as an inline alert on dark surfaces", async () => {
    // arrange
    mockWaitlistSubmit({
      success: false,
      error: {
        code: "invalid_email",
        message: "Unable to process waitlist signup.",
      },
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    const alert = await screen.findByRole("alert");
    const input = screen.getByLabelText("Email address");

    expect(alert).toHaveClass("text-feedback-danger-on-inverted");
    expect(alert).toHaveTextContent("That email doesn't look quite right — give it one more look.");
    expect(alert.id).toBeTruthy();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("renders server errors with a support email fallback", async () => {
    // arrange
    mockWaitlistSubmit({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong on our end. Try again in a moment",
    );
    expect(screen.getByRole("link", { name: ELI_COACH_CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${ELI_COACH_CONTACT_EMAIL}`,
    );
  });
});
