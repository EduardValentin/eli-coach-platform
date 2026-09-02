// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { SignInButton } from "@clerk/react-router";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

// SignInButton clones its single child and wires up an onClick handler that
// calls into a live Clerk instance (see @clerk/react-router's SignInButton).
// Rendering it for real needs a ClerkProvider backed by a loaded Clerk client,
// which this component test has no reason to stand up — the button's label,
// role, and enabled state don't depend on Clerk being loaded, so the mock
// renders the child directly instead. `vi.fn` keeps it spyable so the redirect
// props the page passes in can be asserted.
vi.mock("@clerk/react-router", () => ({
  SignInButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import SignInFailedRoute from "./sign-in-failed-page";

const STORE_PATH = "/app/store";

function renderSignInFailedPage() {
  const router = createMemoryRouter(
    [
      {
        Component: SignInFailedRoute,
        loader: () => ({ storePath: STORE_PATH }),
        path: "/sign-in-failed",
      },
    ],
    { initialEntries: ["/sign-in-failed"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("SignInFailedRoute", () => {
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
      expect.objectContaining({
        fallbackRedirectUrl: STORE_PATH,
        signUpFallbackRedirectUrl: STORE_PATH,
      }),
      undefined,
    );
  });
});
