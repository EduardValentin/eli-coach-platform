// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import DownloadRoute from "./download-page";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("store download page", () => {
  it("moves the fragment token into a native POST form and removes it from browser history", async () => {
    // arrange
    window.history.replaceState(
      {},
      "",
      "/store/download#opaque-download-token",
    );

    // act
    const { container } = render(
      <MemoryRouter>
        <DownloadRoute />
      </MemoryRouter>,
    );

    // assert
    expect(
      await screen.findByRole("button", {
        name: "Download your resources",
      }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.hash).toBe("");
    });
    const form = container.querySelector("form");
    const tokenInput = container.querySelector<HTMLInputElement>(
      'input[name="token"]',
    );
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/api/store/downloads");
    expect(tokenInput).toHaveValue("opaque-download-token");
  });

  it("shows the same unavailable state when no private token is present", async () => {
    // arrange
    window.history.replaceState({}, "", "/store/download");

    // act
    render(
      <MemoryRouter>
        <DownloadRoute />
      </MemoryRouter>,
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to the store/i }),
    ).toHaveAttribute("href", "/store");
  });

  it("shows the branded unavailable state after a failed token resolution", async () => {
    // arrange
    window.history.replaceState(
      {},
      "",
      "/store/download?unavailable=1",
    );

    // act
    render(
      <MemoryRouter>
        <DownloadRoute />
      </MemoryRouter>,
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "This link is no longer available",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to the store/i }),
    ).toHaveAttribute("href", "/store");
  });
});
