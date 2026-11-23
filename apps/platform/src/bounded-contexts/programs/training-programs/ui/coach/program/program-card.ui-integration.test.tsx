// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import {
  programBuilderPath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import type { ProgramCardView } from "~/bounded-contexts/programs/training-programs/public/program-card";

import { ProgramCard } from "./program-card";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

type CardDraft = Extract<ProgramCardView, { state: "draft" }>["draft"];

const FILLED_DRAFT: CardDraft = {
  versionNumber: 1,
  blocks: [
    {
      type: "foundation",
      typeLabel: "Foundation",
      weeks: 4,
      filledSessions: 3,
      sessions: 3,
    },
    {
      type: "hypertrophy",
      typeLabel: "Hypertrophy",
      weeks: 6,
      filledSessions: 3,
      sessions: 3,
    },
    {
      type: "deload",
      typeLabel: "Deload",
      weeks: 1,
      filledSessions: 3,
      sessions: 3,
    },
  ],
};

const UNFILLED_DRAFT: CardDraft = {
  versionNumber: 1,
  blocks: [
    {
      type: "foundation",
      typeLabel: "Foundation",
      weeks: 4,
      filledSessions: 0,
      sessions: 3,
    },
    {
      type: "hypertrophy",
      typeLabel: "Hypertrophy",
      weeks: 6,
      filledSessions: 0,
      sessions: 3,
    },
    {
      type: "deload",
      typeLabel: "Deload",
      weeks: 1,
      filledSessions: 0,
      sessions: 3,
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("the Program card", () => {
  it("holds the program back until her answers are approved", async () => {
    // arrange, act
    await renderCard({ state: "waiting", gender: "female" });

    // assert
    const card = programCard();
    expect(within(card).getByText("No program yet")).toBeInTheDocument();
    expect(
      within(card).getByText(
        "The program opens once her answers are approved.",
      ),
    ).toBeInTheDocument();
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers to build a program once her answers are approved", async () => {
    // arrange, act
    await renderCard({ state: "ready-to-build", gender: "female" });

    // assert
    const card = programCard();
    expect(within(card).getByText("No program yet")).toBeInTheDocument();
    expect(
      within(card).getByText("Build it from her profile."),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Build program" }),
    ).toHaveAttribute("href", programSetupPath(CLIENT_ID));
  });

  it("says there is no program once her coaching has ended and offers nothing", async () => {
    // arrange, act
    await renderCard({ state: "coaching-ended", gender: "female" });

    // assert
    const card = programCard();
    expect(within(card).getByText("No program")).toBeInTheDocument();
    expect(
      within(card).getByText("Her coaching has ended."),
    ).toBeInTheDocument();
    expect(within(card).queryByText("No program yet")).not.toBeInTheDocument();
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    ["male", "His coaching has ended."],
    ["prefer_not_to_say", "Their coaching has ended."],
  ] as const)(
    "words the ended coaching for a %s client",
    async (gender, line) => {
      // arrange, act
      await renderCard({ state: "coaching-ended", gender });

      // assert
      expect(within(programCard()).getByText(line)).toBeInTheDocument();
    },
  );

  it("words the reasons for his program with his pronoun", async () => {
    // arrange, act
    await renderCard({ state: "ready-to-build", gender: "male" });

    // assert
    expect(
      within(programCard()).getByText("Build it from his profile."),
    ).toBeInTheDocument();
  });

  it("lists the draft blocks and says it is ready to publish", async () => {
    // arrange, act
    await renderCard({
      state: "draft",
      gender: "female",
      draft: FILLED_DRAFT,
      stillMissing: [],
    });

    // assert
    const card = programCard();
    expect(within(card).getByText("Version 1 · draft")).toBeInTheDocument();
    expect(blockLines(card)).toEqual([
      "1Foundation · 4 wk3 of 3 sessions",
      "2Hypertrophy · 6 wk3 of 3 sessions",
      "3Deload · 1 wk3 of 3 sessions",
    ]);
    expect(within(card).getByText("Ready to publish")).toBeInTheDocument();
    expect(
      within(card).queryByRole("list", { name: "Still missing" }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("link", { name: "Build program" }),
    ).not.toBeInTheDocument();
  });

  it("counts the sessions that still have no exercises", async () => {
    // arrange, act
    await renderCard({
      state: "draft",
      gender: "female",
      draft: UNFILLED_DRAFT,
      stillMissing: ["9 sessions without exercises"],
    });

    // assert
    const card = programCard();
    expect(blockLines(card)).toEqual([
      "1Foundation · 4 wk0 of 3 sessions",
      "2Hypertrophy · 6 wk0 of 3 sessions",
      "3Deload · 1 wk0 of 3 sessions",
    ]);
    const missing = within(card).getByRole("list", { name: "Still missing" });
    expect(
      within(missing)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["9 sessions without exercises"]);
    expect(
      within(card).queryByText("Ready to publish"),
    ).not.toBeInTheDocument();
  });

  it("still shows her draft after her coaching has ended and says it can’t be published", async () => {
    // arrange, act
    await renderCard({
      state: "draft-coaching-ended",
      gender: "female",
      draft: FILLED_DRAFT,
    });

    // assert
    const card = programCard();
    expect(within(card).getByText("Version 1 · draft")).toBeInTheDocument();
    expect(blockLines(card)).toEqual([
      "1Foundation · 4 wk3 of 3 sessions",
      "2Hypertrophy · 6 wk3 of 3 sessions",
      "3Deload · 1 wk3 of 3 sessions",
    ]);
    expect(
      within(card).getByText(
        "Her coaching has ended, so this draft can’t be published.",
      ),
    ).toBeInTheDocument();
    expect(within(card).queryByText("No program")).not.toBeInTheDocument();
    expect(
      within(card).queryByText("Ready to publish"),
    ).not.toBeInTheDocument();
  });

  it("says his unfinished draft can’t be published once his coaching has ended, in place of what is missing", async () => {
    // arrange, act
    await renderCard({
      state: "draft-coaching-ended",
      gender: "male",
      draft: UNFILLED_DRAFT,
    });

    // assert
    const card = programCard();
    expect(within(card).getAllByText("0 of 3 sessions")).toHaveLength(3);
    expect(
      within(card).getByText(
        "His coaching has ended, so this draft can’t be published.",
      ),
    ).toBeInTheDocument();
    expect(within(card).queryByText("Still missing")).not.toBeInTheDocument();
  });

  it.each(["draft", "draft-coaching-ended"] as const)(
    "offers to continue the %s in the builder",
    async (state) => {
      // arrange, act
      await renderCard(
        state === "draft"
          ? { state, gender: "female", draft: FILLED_DRAFT, stillMissing: [] }
          : { state, gender: "female", draft: FILLED_DRAFT },
      );

      // assert
      expect(
        within(programCard()).getByRole("link", { name: "Continue draft" }),
      ).toHaveAttribute("href", programBuilderPath(CLIENT_ID));
    },
  );
});

function programCard(): HTMLElement {
  return screen.getByRole("region", { name: "Program" });
}

function blockLines(card: HTMLElement): (string | null)[] {
  return within(within(card).getByRole("list", { name: "Blocks" }))
    .getAllByRole("listitem")
    .map((block) => block.textContent);
}

async function renderCard(card: ProgramCardView) {
  const router = createMemoryRouter(
    [
      {
        Component: () => <ProgramCard card={card} clientId={CLIENT_ID} />,
        path: "/",
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("region", { name: "Program" });
}
