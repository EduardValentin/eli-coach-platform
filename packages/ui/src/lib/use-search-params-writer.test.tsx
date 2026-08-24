// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { useSearchParamsWriter } from "./use-search-params-writer";

afterEach(() => {
  cleanup();
});

function SearchParamsProbe() {
  const { searchParams, writeSearchParams } = useSearchParamsWriter();

  return (
    <div>
      <button
        onClick={() => writeSearchParams((params) => params.set("type", "a"))}
        type="button"
      >
        set type
      </button>
      <button
        onClick={() => writeSearchParams((params) => params.set("goal", "b"))}
        type="button"
      >
        set goal
      </button>
      <button
        onClick={() => writeSearchParams((params) => params.delete("type"))}
        type="button"
      >
        clear type
      </button>
      <p>search: {searchParams.toString()}</p>
    </div>
  );
}

function renderProbe(url = "/") {
  const router = createMemoryRouter(
    [{ Component: SearchParamsProbe, path: "/" }],
    { initialEntries: [url] },
  );

  return { ...render(<RouterProvider router={router} />), router };
}

describe("search params writer", () => {
  it("writes a revision into the URL", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderProbe();

    // act
    await user.click(screen.getByRole("button", { name: "set type" }));

    // assert
    expect(router.state.location.search).toBe("?type=a");
  });

  it("leaves the URL alone when a revision changes nothing", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderProbe("/?goal=b");
    const originalKey = router.state.location.key;

    // act
    await user.click(screen.getByRole("button", { name: "clear type" }));

    // assert
    expect(router.state.location.search).toBe("?goal=b");
    expect(router.state.location.key).toBe(originalKey);
  });

  it("builds a second revision on the first when both land in one render", async () => {
    // arrange
    const { router } = renderProbe();

    await screen.findByRole("button", { name: "set type" });

    // act
    // `fireEvent` rather than `userEvent`: the point is two revisions reaching
    // React in one batch, which awaited interactions never produce.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "set type" }));
      fireEvent.click(screen.getByRole("button", { name: "set goal" }));
    });

    // assert
    expect(router.state.location.search).toBe("?type=a&goal=b");
  });

  it("accepts the same revision again after a navigation was interrupted", async () => {
    // arrange
    const user = userEvent.setup();
    const { router } = renderProbe();

    await screen.findByRole("button", { name: "set type" });

    // act
    // The interruption settles on the search the revision started from, so the
    // URL never registers that anything happened.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set type" }));
      await router.navigate("/");
    });
    expect(router.state.location.search).toBe("");

    await user.click(screen.getByRole("button", { name: "set type" }));

    // assert
    expect(router.state.location.search).toBe("?type=a");
  });
});
