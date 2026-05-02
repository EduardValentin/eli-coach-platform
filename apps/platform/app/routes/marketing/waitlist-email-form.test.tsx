// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFetcher } from "react-router";

import { WaitlistEmailForm } from "./waitlist-email-form";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function mockFetcher(fetcher: Partial<ReturnType<typeof useFetcher>>) {
  vi.mocked(useFetcher).mockReturnValue({
    Form: "form",
    data: undefined,
    state: "idle",
    ...fetcher,
  } as unknown as ReturnType<typeof useFetcher>);
}

describe("WaitlistEmailForm", () => {
  it("disables submit while the email is empty", () => {
    mockFetcher({});

    render(<WaitlistEmailForm cap={10} spotsRemaining={10} variant="dark" />);

    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("enables submit after entering an email", async () => {
    const user = userEvent.setup();
    mockFetcher({});

    render(<WaitlistEmailForm cap={10} spotsRemaining={10} variant="dark" />);
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");

    expect(screen.getByRole("button", { name: "Join the list" })).toBeEnabled();
  });

  it("hard-disables the form when sold out", () => {
    mockFetcher({});

    render(<WaitlistEmailForm cap={10} spotsRemaining={0} variant="dark" />);

    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("shows success state from fetcher data", () => {
    mockFetcher({
      data: {
        success: true,
        spotsRemaining: 9,
      },
    });

    render(<WaitlistEmailForm cap={10} spotsRemaining={10} variant="dark" />);

    expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
  });
});
