// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionRuntimeState } from "~/modules/bot-detection/bot-detection-contract";
import { createTestQueryClient, createTestQueryClientWrapper } from "~/test/query-client";

import { WaitlistEmailForm } from "./waitlist-email-form";
import { launchWaitlistConfetti } from "./waitlist-confetti";
import { WAITLIST_API_URL } from "./waitlist-query";

vi.mock("./waitlist-confetti", () => ({
  launchWaitlistConfetti: vi.fn(),
}));

const STATIC_BOT_DETECTION = {
  config: {
    provider: "static",
    token: TURNSTILE_TEST_RESPONSE_TOKEN,
  },
  status: "ready",
} satisfies BotDetectionRuntimeState;

const TURNSTILE_BOT_DETECTION = {
  config: {
    provider: "turnstile",
    siteKey: "turnstile-site-key",
  },
  status: "ready",
} satisfies BotDetectionRuntimeState;

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
  availability?: "available" | "limited" | "closed" | null;
  botDetection?: BotDetectionRuntimeState;
  variant?: "dark" | "light";
}) {
  const queryClient = createTestQueryClient();

  return render(
    <MemoryRouter>
      <WaitlistEmailForm
        availability={
          options?.availability === undefined ? "available" : options.availability
        }
        botDetection={options?.botDetection ?? STATIC_BOT_DETECTION}
        variant={options?.variant ?? "dark"}
      />
    </MemoryRouter>,
    { wrapper: createTestQueryClientWrapper(queryClient) },
  );
}

function getBotDetectionResponseInput() {
  return screen.getByTestId("bot-detection-response");
}

function getEmailInput() {
  return screen.getByRole("textbox", { name: /\S/ });
}

function getWaitlistForm() {
  const form = getEmailInput().closest("form");

  if (!form) {
    throw new Error("Expected the email input to belong to a form.");
  }

  return form;
}

function getSubmitButton() {
  return within(getWaitlistForm()).getByRole("button", {
    name: /\S/,
  }) as HTMLButtonElement;
}

function mockWaitlistSubmit(
  response: Parameters<typeof HttpResponse.json>[0],
  init?: ResponseInit,
) {
  server.use(http.post(WAITLIST_API_URL, () => HttpResponse.json(response, init)));
}

async function typeEmailAndSubmit() {
  const user = userEvent.setup();

  await user.type(getEmailInput(), "eli@example.com");
  await waitFor(() => {
    expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
  });
  await user.click(getSubmitButton());
}

describe("WaitlistEmailForm", () => {
  it("places named consent links before the form controls without requiring a checkbox", () => {
    // arrange
    // act
    renderForm();
    const form = getWaitlistForm();
    const consentLinks = within(form).getAllByRole("link", { name: /\S/ });
    const notice = consentLinks[0]?.closest("p");
    const emailInput = getEmailInput();
    const submitButton = getSubmitButton();

    // assert
    expect(notice).toBeInTheDocument();
    expect(consentLinks[1]?.closest("p")).toBe(notice);
    expect(consentLinks.map((link) => link.getAttribute("href"))).toEqual([
      "mailto:privacy@evoa.fit",
      "/privacy",
    ]);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(notice?.compareDocumentPosition(emailInput)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(notice?.compareDocumentPosition(submitButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("leaves consent privacy navigation to the browser", async () => {
    // arrange
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [
        {
          element: (
            <WaitlistEmailForm
              availability="available"
              botDetection={STATIC_BOT_DETECTION}
              variant="dark"
            />
          ),
          path: "/",
        },
        {
          element: <h1>Privacy page</h1>,
          path: "/privacy",
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />, {
      wrapper: createTestQueryClientWrapper(queryClient),
    });

    const privacyLink = within(getWaitlistForm())
      .getAllByRole("link", { name: /\S/ })
      .find((link) => link.getAttribute("href") === "/privacy");
    const preventDocumentNavigation = (event: MouseEvent) => {
      event.preventDefault();
    };

    if (!privacyLink) {
      throw new Error("Expected the waitlist consent notice to link to the privacy page.");
    }

    document.addEventListener("click", preventDocumentNavigation);

    try {
      // act
      await user.click(privacyLink);

      // assert
      expect(router.state.location.pathname).toBe("/");
    } finally {
      document.removeEventListener("click", preventDocumentNavigation);
    }
  });

  it("enables submit after an email is entered", async () => {
    // arrange
    const user = userEvent.setup();
    renderForm();
    const submitButton = getSubmitButton();
    const wasInitiallyDisabled = submitButton.disabled;

    // act
    await user.type(getEmailInput(), "eli@example.com");

    // assert
    expect(wasInitiallyDisabled).toBe(true);
    expect(submitButton).toBeEnabled();
  });

  it("keeps submit disabled while runtime bot configuration is loading", async () => {
    // arrange
    const user = userEvent.setup();
    renderForm({
      botDetection: {
        config: null,
        status: "loading",
      },
    });

    // act
    await user.type(getEmailInput(), "eli@example.com");

    // assert
    expect(getSubmitButton()).toBeDisabled();
    expect(screen.queryByTestId("bot-detection-widget")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains when runtime bot configuration is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    renderForm({
      botDetection: {
        config: null,
        status: "unavailable",
      },
    });

    // act
    await user.type(getEmailInput(), "eli@example.com");

    // assert
    expect(getSubmitButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "couldn't prepare this form",
    );
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
    await user.type(getEmailInput(), "eli@example.com");
    await user.click(getSubmitButton());

    // assert
    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });

    resolveSubmit();
  });

  it("replaces the form after a successful waitlist API response", async () => {
    // arrange
    mockWaitlistSubmit({
      success: true,
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
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

    renderForm({ availability: "closed" });
    const user = userEvent.setup();

    // act
    await user.type(getEmailInput(), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(getSubmitButton());

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(launchWaitlistConfetti).toHaveBeenCalledTimes(1);
  });

  it("disables native validation for app-controlled email validation", () => {
    // arrange
    renderForm();

    // act
    const input = getEmailInput();

    // assert
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input.closest("form")).toHaveAttribute("novalidate");
  });

  it("renders the configured invisible Turnstile widget inside the waitlist form", () => {
    // arrange
    renderForm({ botDetection: TURNSTILE_BOT_DETECTION });

    // act
    const widget = screen.getByTestId("bot-detection-widget");

    // assert
    expect(widget).toHaveAttribute("data-sitekey", "turnstile-site-key");
    expect(widget).toHaveAttribute("data-action", "waitlist_join");
    expect(widget).toHaveAttribute("data-size", "invisible");
    expect(widget).toHaveAttribute("data-response-field-name", "cf-turnstile-response");
    expect(widget?.closest("form")).toBe(getWaitlistForm());
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
              message: "api-error",
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
    await user.type(getEmailInput(), "eli@example.com");
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });
    await user.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(getBotDetectionResponseInput()).toHaveValue(TURNSTILE_TEST_RESPONSE_TOKEN);
    });

    await user.click(getSubmitButton());

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(submitCount).toBe(2);
  });

  it("relates invalid email errors to the form control", async () => {
    // arrange
    mockWaitlistSubmit({
      success: false,
      error: {
        code: "invalid_email",
        message: "api-error",
      },
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    const alert = await screen.findByRole("alert");
    const input = getEmailInput();

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
        message: "api-error",
      },
    });

    renderForm();

    // act
    await typeEmailAndSubmit();

    // assert
    const alert = await screen.findByRole("alert");
    const supportLink = within(alert).getByRole("link", { name: /\S/ });

    expect(supportLink).toHaveAttribute("href", `mailto:${ELI_COACH_CONTACT_EMAIL}`);
  });
});
