// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { SignInButton } from "@clerk/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react-router", () => ({
  SignInButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import { SignInFailedPage } from "./sign-in-failed-page";

const STORE_PATH = "/app/store";

afterEach(() => {
  cleanup();
});

function renderSignInFailedPage() {
  return render(<SignInFailedPage continuePath={STORE_PATH} />);
}

describe("SignInFailedPage", () => {
  it("explains the failure and offers an enabled retry action", async () => {
    // arrange & act
    renderSignInFailedPage();

    // assert
    expect(
      await screen.findByRole("heading", {
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

  it("sends a successful retry to the store rather than back to this page", async () => {
    // arrange
    const spy = vi.mocked(SignInButton);

    // act
    renderSignInFailedPage();
    await screen.findByRole("button", { name: "Try Again" });

    // assert
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackRedirectUrl: STORE_PATH }),
      undefined,
    );
  });
});
