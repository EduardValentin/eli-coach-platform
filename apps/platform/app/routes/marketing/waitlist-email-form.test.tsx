// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { FetcherWithComponents } from "react-router";
import { beforeEach, vi } from "vitest";

import { CLOUDFLARE_TURNSTILE_DUMMY_TOKEN } from "~/modules/bot-detection/bot-detection-contract";

import { WaitlistEmailForm } from "./waitlist-email-form";
import { launchWaitlistConfetti } from "./waitlist-confetti";

vi.mock("./waitlist-confetti", () => ({
  launchWaitlistConfetti: vi.fn(),
}));

afterEach(() => {
  cleanup();
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
  options?: { spotsRemaining?: number | null },
) {
  const fetcher = createFetcher(fetcherOverrides);

  return render(
    <WaitlistEmailForm
      fetcher={fetcher}
      response={fetcher.data ?? null}
      spotsRemaining={options?.spotsRemaining ?? 10}
      turnstileSiteKey="1x00000000000000000000BB"
      variant="dark"
    />,
  );
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
    const fetcher = createFetcher();

    render(
      <WaitlistEmailForm
        fetcher={fetcher}
        response={fetcher.data ?? null}
        spotsRemaining={0}
        turnstileSiteKey="1x00000000000000000000BB"
        variant="dark"
      />,
    );

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

  it("renders the invisible Turnstile widget inside the waitlist form", () => {
    const { container } = renderForm();

    const widget = container.querySelector("[data-turnstile-widget]");

    expect(widget).toHaveAttribute("data-sitekey", "1x00000000000000000000BB");
    expect(widget).toHaveAttribute("data-action", "waitlist_join");
    expect(widget).toHaveAttribute("data-size", "invisible");
    expect(widget).toHaveAttribute("data-response-field-name", "cf-turnstile-response");
    expect(widget?.closest("form")).toBe(screen.getByLabelText("Email address").closest("form"));
    expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveAttribute(
      "type",
      "hidden",
    );
  });

  it("prepares the Cloudflare dummy token for local test keys", async () => {
    const { container } = renderForm();

    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue(
        CLOUDFLARE_TURNSTILE_DUMMY_TOKEN,
      );
    });
  });

  it("submits through Turnstile and clears the used token", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const fetcher = createFetcher({ submit });
    const { container } = render(
      <WaitlistEmailForm
        fetcher={fetcher}
        response={null}
        spotsRemaining={10}
        turnstileSiteKey="1x00000000000000000000BB"
        variant="dark"
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue(
        CLOUDFLARE_TURNSTILE_DUMMY_TOKEN,
      );
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    expect(submit).toHaveBeenCalledTimes(1);
    const [formData, submitOptions] = submit.mock.calls[0] as [
      FormData,
      { action: string; method: string },
    ];
    expect(formData.get("email")).toBe("eli@example.com");
    expect(formData.get("cf-turnstile-response")).toBe(CLOUDFLARE_TURNSTILE_DUMMY_TOKEN);
    expect(submitOptions).toEqual({
      action: "/api/waitlist",
      method: "post",
    });
    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue("");
    });
  });

  it("resets Turnstile after a server error before the next retry", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const fetcher = createFetcher({ submit });
    const serverErrorResponse: WaitlistJoinResponse = {
      success: false,
      error: {
        code: "server_error",
        message: "Something went wrong on our end. Try again in a moment.",
      },
    };
    const { container, rerender } = render(
      <WaitlistEmailForm
        fetcher={fetcher}
        response={null}
        spotsRemaining={10}
        turnstileSiteKey="1x00000000000000000000BB"
        variant="dark"
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue(
        CLOUDFLARE_TURNSTILE_DUMMY_TOKEN,
      );
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));
    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue("");
    });

    rerender(
      <WaitlistEmailForm
        fetcher={fetcher}
        response={serverErrorResponse}
        spotsRemaining={10}
        turnstileSiteKey="1x00000000000000000000BB"
        variant="dark"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('input[name="cf-turnstile-response"]')).toHaveValue(
        CLOUDFLARE_TURNSTILE_DUMMY_TOKEN,
      );
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
          message: "That email doesn't look quite right — give it one more look.",
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

  it("renders server errors with a support email fallback", () => {
    renderForm({
      data: {
        success: false,
        error: {
          code: "server_error",
          message: "Something went wrong on our end. Try again in a moment.",
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
