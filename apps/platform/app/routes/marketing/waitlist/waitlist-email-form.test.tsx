// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { PropsWithChildren } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";

import { WaitlistEmailForm } from "./waitlist-email-form";
import { launchWaitlistConfetti } from "./waitlist-confetti";

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

const WAITLIST_API_URL = "http://localhost/api/waitlist";

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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
}

function renderForm(options?: {
  botDetectionConfig?: BotDetectionConfig;
  spotsRemaining?: number | null;
  variant?: "dark" | "light";
  waitlistApiUrl?: string;
}) {
  const queryClient = createTestQueryClient();

  function Wrapper(props: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
  }

  return render(
    <WaitlistEmailForm
      botDetectionConfig={options?.botDetectionConfig ?? STATIC_BOT_DETECTION}
      spotsRemaining={options?.spotsRemaining ?? 10}
      variant={options?.variant ?? "dark"}
      waitlistApiUrl={options?.waitlistApiUrl ?? WAITLIST_API_URL}
    />,
    { wrapper: Wrapper },
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

    renderForm({ spotsRemaining: 0 });

    expect(
      screen.queryByText("All 10 spots have been claimed", { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    expect(screen.getByRole("button", { name: "Notify me" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("shows the CTA loading state while submitting", async () => {
    let resolveSubmit: () => void = () => {};
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const user = userEvent.setup();
    server.use(
      http.post(WAITLIST_API_URL, async () => {
        await submitPromise;

        return HttpResponse.json({
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        });
      }),
    );

    renderForm();
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Joining the list" })).toBeDisabled();
    });

    resolveSubmit();
  });

  it("shows success state from the waitlist API response", async () => {
    mockWaitlistSubmit({
      pricing: "reduced",
      spotsRemaining: 9,
      success: true,
    });

    renderForm();
    await typeEmailAndSubmit();

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
  });

  it("shows success with confetti and without a toast for reduced pricing", async () => {
    mockWaitlistSubmit({
      pricing: "reduced",
      spotsRemaining: 9,
      success: true,
    });

    renderForm();
    await typeEmailAndSubmit();

    await waitFor(() => {
      expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not launch confetti after regular pricing signup", async () => {
    mockWaitlistSubmit({
      pricing: "regular",
      spotsRemaining: 0,
      success: true,
    });

    renderForm({ spotsRemaining: 0 });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(screen.getByRole("button", { name: "Notify me" }));

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
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
    renderForm({ botDetectionConfig: TURNSTILE_BOT_DETECTION });

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

  it("submits the email and bot detection token through the waitlist API", async () => {
    const submittedValues = {
      email: null as FormDataEntryValue | null,
      token: null as FormDataEntryValue | null,
    };
    server.use(
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedValues.email = formData.get("email");
        submittedValues.token = formData.get("cf-turnstile-response");

        return HttpResponse.json({
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        });
      }),
    );

    renderForm();
    await typeEmailAndSubmit();

    await waitFor(() => {
      expect(submittedValues.email).toBe("eli@example.com");
    });
    expect(submittedValues.token).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
  });

  it("resets bot detection after a server error before the next retry", async () => {
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
          pricing: "reduced",
          spotsRemaining: 9,
          success: true,
        });
      }),
    );

    renderForm();
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

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    expect(submitCount).toBe(2);
  });

  it("renders invalid email errors as an inline alert on dark surfaces", async () => {
    mockWaitlistSubmit({
      success: false,
      error: {
        code: "invalid_email",
        message: "Unable to process waitlist signup.",
      },
    });

    renderForm();
    await typeEmailAndSubmit();

    const alert = await screen.findByRole("alert");
    const input = screen.getByLabelText("Email address");

    expect(alert).toHaveClass("text-feedback-danger-on-inverted");
    expect(alert).toHaveTextContent("That email doesn't look quite right — give it one more look.");
    expect(alert).not.toHaveAttribute("id");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("renders server errors with a support email fallback", async () => {
    mockWaitlistSubmit({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });

    renderForm();
    await typeEmailAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong on our end. Try again in a moment",
    );
    expect(screen.getByRole("link", { name: ELI_COACH_CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${ELI_COACH_CONTACT_EMAIL}`,
    );
  });
});
