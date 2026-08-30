// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { SignInButton, SignOutButton } from "@clerk/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

// SignInButton and SignOutButton clone their single child and wire up an
// onClick handler backed by a live Clerk instance (see @clerk/react-router).
// Rendering them for real needs a ClerkProvider backed by a loaded Clerk
// client, which this component test has no reason to stand up — the
// control's label, role, and enabled state don't depend on Clerk being
// loaded, so the mock renders the child directly instead. Wrapping each in
// `vi.fn` keeps the mock spyable so the redirect-prop tests can assert what
// AuthNavActions passed in, without either control doing anything live.
vi.mock("@clerk/react-router", () => ({
  SignInButton: vi.fn(({ children }: PropsWithChildren) => children),
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

afterEach(() => {
  cleanup();
});

import { AuthNavActions } from "./auth-nav-actions";

const STORE_PATH = "/app/store";

function renderAuthNavActions(
  props: Omit<Parameters<typeof AuthNavActions>[0], "storePath">,
) {
  return render(
    <MemoryRouter>
      <AuthNavActions storePath={STORE_PATH} {...props} />
    </MemoryRouter>,
  );
}

describe("AuthNavActions", () => {
  it("offers a Sign In control to an anonymous visitor and nothing else", () => {
    // arrange & act
    renderAuthNavActions({ session: { kind: "anonymous" } });

    // assert
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers only Sign Out to a signed-in USER, with no portal link", () => {
    // arrange & act
    renderAuthNavActions({ session: { kind: "authenticated", role: "USER" } });

    // assert
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers a Client Portal link plus Sign Out to a signed-in CLIENT", () => {
    // arrange & act
    renderAuthNavActions({ session: { kind: "authenticated", role: "CLIENT" } });

    // assert
    const portalLink = screen.getByRole("link", { name: "Client Portal" });
    expect(portalLink).toHaveAttribute("href", "/client");
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("offers a Coach Portal link plus Sign Out to a signed-in COACH", () => {
    // arrange & act
    renderAuthNavActions({ session: { kind: "authenticated", role: "COACH" } });

    // assert
    const portalLink = screen.getByRole("link", { name: "Coach Portal" });
    expect(portalLink).toHaveAttribute("href", "/coach");
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("never renders an account or profile menu", () => {
    // arrange & act
    renderAuthNavActions({ session: { kind: "authenticated", role: "COACH" } });

    // assert
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /account|profile/i })).not.toBeInTheDocument();
  });

  it("places supplied children between the portal link and the Sign Out control", () => {
    // arrange & act
    const { container } = renderAuthNavActions({
      children: <span data-testid="cart-slot">Cart</span>,
      session: { kind: "authenticated", role: "CLIENT" },
    });

    // assert
    const portalLink = screen.getByRole("link", { name: "Client Portal" });
    const cartSlot = within(container).getByTestId("cart-slot");
    const signOutButton = screen.getByRole("button", { name: "Sign Out" });
    const position = portalLink.compareDocumentPosition(cartSlot);

    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cartSlot.compareDocumentPosition(signOutButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("wires SignInButton's redirect props to the caller's store path", () => {
    // arrange
    // SignInButton is mocked to render its children directly, so the redirect
    // props themselves are asserted through a spy on the mocked component call.
    const spy = vi.mocked(SignInButton);

    // act
    renderAuthNavActions({ session: { kind: "anonymous" } });

    // assert
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackRedirectUrl: STORE_PATH,
        signUpFallbackRedirectUrl: STORE_PATH,
      }),
      undefined,
    );
  });

  it("wires SignOutButton's redirect prop to the caller's store path", () => {
    // arrange
    const spy = vi.mocked(SignOutButton);

    // act
    renderAuthNavActions({ session: { kind: "authenticated", role: "USER" } });

    // assert
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: STORE_PATH }),
      undefined,
    );
  });
});
