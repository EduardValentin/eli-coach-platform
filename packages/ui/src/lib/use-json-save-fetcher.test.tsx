// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  type ActionFunctionArgs,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  useJsonSaveFetcher,
  type JsonSaveOutcome,
  type JsonSaveTarget,
} from "./use-json-save-fetcher";

type Problems = { name?: string };

type SavedAnswer = { redirectTo: string };

type RefusedAnswer = { problems: Problems };

afterEach(() => {
  cleanup();
});

function isRecord(answer: unknown): answer is Record<string, unknown> {
  return typeof answer === "object" && answer !== null;
}

const savedAnswer = {
  safeParse: (answer: unknown) =>
    isRecord(answer) && typeof answer.redirectTo === "string"
      ? { success: true as const, data: { redirectTo: answer.redirectTo } }
      : { success: false as const },
};

const refusedAnswer = {
  safeParse: (answer: unknown) =>
    isRecord(answer) && isRecord(answer.problems)
      ? { success: true as const, data: answer as RefusedAnswer }
      : { success: false as const },
};

function SaveProbe({
  target,
  onSettled,
}: {
  target: JsonSaveTarget;
  onSettled: (outcome: JsonSaveOutcome<Problems>) => void;
}) {
  const { save, saving } = useJsonSaveFetcher({
    onSettled,
    refusedAnswer,
    savedAnswer,
    target,
  });

  return (
    <>
      <button onClick={() => save({ name: "Oats" })} type="button">
        Save
      </button>
      <p>{saving ? "Saving" : "Idle"}</p>
    </>
  );
}

function renderProbe({
  target = { action: "/foods", method: "post" },
  answer,
}: {
  target?: JsonSaveTarget;
  answer: (args: ActionFunctionArgs) => Promise<unknown>;
}) {
  const onSettled = vi.fn<(outcome: JsonSaveOutcome<Problems>) => void>();
  const router = createMemoryRouter([
    { element: <SaveProbe onSettled={onSettled} target={target} />, path: "/" },
    { action: answer, path: "/foods" },
    { action: answer, path: "/foods/:foodId" },
  ]);

  render(<RouterProvider router={router} />);

  return { onSettled };
}

describe("useJsonSaveFetcher", () => {
  it("settles as saved with the page the answer sends the coach to", async () => {
    // arrange
    const user = userEvent.setup();
    const { onSettled } = renderProbe({
      answer: async () => ({ redirectTo: "/foods/oats" }) satisfies SavedAnswer,
    });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    await waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith({
        redirectTo: "/foods/oats",
        status: "saved",
      }),
    );
  });

  it("settles as refused with the problems the answer names", async () => {
    // arrange
    const user = userEvent.setup();
    const { onSettled } = renderProbe({
      answer: async () =>
        ({ problems: { name: "taken" } }) satisfies RefusedAnswer,
    });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    await waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith({
        problems: { name: "taken" },
        status: "refused",
      }),
    );
  });

  it("settles as failed when the answer is neither saved nor refused", async () => {
    // arrange
    const user = userEvent.setup();
    const { onSettled } = renderProbe({
      answer: async () => ({ message: "Something went wrong" }),
    });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    await waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith({ status: "failed" }),
    );
  });

  it("sends the request as JSON to the target's action with its method", async () => {
    // arrange
    const user = userEvent.setup();
    const received = vi.fn<(method: string, body: unknown) => void>();
    renderProbe({
      answer: async ({ request }) => {
        received(request.method, await request.json());
        return { redirectTo: "/foods" };
      },
      target: { action: "/foods/oats", method: "put" },
    });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    await waitFor(() =>
      expect(received).toHaveBeenCalledWith("PUT", { name: "Oats" }),
    );
  });

  it("reports saving until the answer arrives", async () => {
    // arrange
    const user = userEvent.setup();
    const unanswered = new Promise<SavedAnswer>(() => {});
    renderProbe({ answer: () => unanswered });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findByText("Saving")).toBeInTheDocument();
  });
});
