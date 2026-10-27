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
  useSaveFetcher,
  type SaveOutcome,
  type SaveTarget,
} from "./use-save-fetcher";

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

function formWithFile(): FormData {
  const form = new FormData();
  form.append("food", JSON.stringify({ name: "Oats" }));
  form.append("photo", new File(["oats"], "oats.txt", { type: "text/plain" }));

  return form;
}

function SaveProbe({
  target,
  onSettled,
}: {
  target: SaveTarget;
  onSettled: (outcome: SaveOutcome<Problems>) => void;
}) {
  const { save, saving, fetcherState } = useSaveFetcher({
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
      <button onClick={() => save(formWithFile())} type="button">
        Save with a file
      </button>
      <p>{saving ? "Saving" : "Idle"}</p>
      <p>{`Fetcher ${fetcherState}`}</p>
    </>
  );
}

function renderProbe({
  target = { action: "/foods", method: "post" },
  answer,
}: {
  target?: SaveTarget;
  answer: (args: ActionFunctionArgs) => Promise<unknown>;
}) {
  const onSettled = vi.fn<(outcome: SaveOutcome<Problems>) => void>();
  const router = createMemoryRouter([
    { element: <SaveProbe onSettled={onSettled} target={target} />, path: "/" },
    { action: answer, path: "/foods" },
    { action: answer, path: "/foods/:foodId" },
  ]);

  render(<RouterProvider router={router} />);

  return { onSettled };
}

describe("useSaveFetcher", () => {
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

  it("sends a form holding a file as multipart form data", async () => {
    // arrange
    const user = userEvent.setup();
    const received = vi.fn<(contentType: string | null) => void>();
    renderProbe({
      answer: async ({ request }) => {
        received(request.headers.get("Content-Type"));
        return { redirectTo: "/foods" };
      },
    });

    // act
    await user.click(screen.getByRole("button", { name: "Save with a file" }));

    // assert
    await waitFor(() =>
      expect(received).toHaveBeenCalledWith(
        expect.stringMatching(/^multipart\/form-data/),
      ),
    );
  });

  it("sends nothing more while a save awaits its answer", async () => {
    // arrange
    const user = userEvent.setup();
    const unanswered = new Promise<SavedAnswer>(() => {});
    const answer = vi.fn(() => unanswered);
    renderProbe({ answer });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saving");

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    expect(answer).toHaveBeenCalledOnce();
  });

  it("names the fetcher's state while the save is sent", async () => {
    // arrange
    const user = userEvent.setup();
    const unanswered = new Promise<SavedAnswer>(() => {});
    renderProbe({ answer: () => unanswered });

    // act
    await user.click(screen.getByRole("button", { name: "Save" }));

    // assert
    expect(await screen.findByText("Fetcher submitting")).toBeInTheDocument();
  });
});
