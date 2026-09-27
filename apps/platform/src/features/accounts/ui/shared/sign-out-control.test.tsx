// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { SignOutButton } from "@clerk/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react-router", () => ({
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import { SignOutControl } from "./sign-out-control";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SignOutControl", () => {
  it("renders the caller's control and signs out to the caller's destination", () => {
    // arrange
    const redirectUrl = "/app/invitation";

    // act
    render(
      <SignOutControl redirectUrl={redirectUrl}>
        <button type="button">Sign out</button>
      </SignOutControl>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(vi.mocked(SignOutButton)).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl }),
      undefined,
    );
  });
});
