// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WaitlistJoinResponse } from "@eli-coach-platform/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { FetcherWithComponents } from "react-router";

import { WaitlistEmailForm } from "./waitlist-email-form";

afterEach(() => {
  cleanup();
});

function createFetcher(fetcher?: Partial<FetcherWithComponents<WaitlistJoinResponse>>) {
  return {
    Form: "form",
    data: undefined,
    state: "idle",
    ...fetcher,
  } as unknown as FetcherWithComponents<WaitlistJoinResponse>;
}

function renderForm(fetcherOverrides?: Partial<FetcherWithComponents<WaitlistJoinResponse>>) {
  const fetcher = createFetcher(fetcherOverrides);

  return render(
    <WaitlistEmailForm
      fetcher={fetcher}
      response={fetcher.data ?? null}
      spotsRemaining={10}
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

  it("hard-disables the form when sold out", () => {
    const fetcher = createFetcher();

    render(
      <WaitlistEmailForm
        fetcher={fetcher}
        response={fetcher.data ?? null}
        spotsRemaining={0}
        variant="dark"
      />,
    );

    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("shows the CTA loading state while submitting", () => {
    renderForm({ state: "submitting" });

    expect(screen.getByRole("button", { name: "Joining the list" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("shows success state from fetcher data", () => {
    renderForm({
      data: {
        success: true,
        spotsRemaining: 9,
      },
    });

    expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
  });

  it("shows success with confetti and without a toast", () => {
    renderForm({
      data: {
        success: true,
        spotsRemaining: 9,
      },
    });

    expect(screen.getByTestId("waitlist-confetti")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
