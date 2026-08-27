// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

// SignInButton clones its single child and wires up an onClick handler that
// calls into a live Clerk instance (see @clerk/react-router's SignInButton).
// Rendering it for real needs a ClerkProvider backed by a loaded Clerk client,
// which this component test has no reason to stand up — the button's label,
// role, and enabled state don't depend on Clerk being loaded, so the mock
// renders the child directly instead.
vi.mock("@clerk/react-router", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
}));

import SignInFailedRoute from "./sign-in-failed-page";

describe("SignInFailedRoute", () => {
  it("explains the failure and offers an enabled retry action", () => {
    // arrange & act
    render(<SignInFailedRoute />);

    // assert
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "We couldn't finish signing you in",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your account couldn't be set up, so we signed you out again. Nothing was lost — give it another go.",
      ),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Try Again" });
    expect(retryButton).toBeEnabled();
  });
});
