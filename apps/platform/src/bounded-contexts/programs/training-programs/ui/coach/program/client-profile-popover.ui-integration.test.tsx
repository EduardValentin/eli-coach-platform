// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { ProgramDraftClientProfile } from "~/bounded-contexts/programs/training-programs/public/program-draft";

import { EditorTopBar } from "./editor-top-bar";

const CLIENT = { clientId: "client-1", firstName: "Jane", lastName: "Doe" };

const PROFILE: ProgramDraftClientProfile = {
  goal: "Build strength",
  equipment: ["Dumbbells", "Resistance bands"],
  trainingPlace: "Home",
  trainingDays: 5,
  sessionMinutes: 45,
  limitations: "Sore left knee",
};

const SAVING = {
  state: "unchanged",
  failing: false,
  retrying: false,
  retryNow: () => {},
  saveNow: () => Promise.resolve("saved" as const),
  reload: () => {},
} as const;

type Screen = "desktop" | "phone";

function stubScreen(shown: Screen) {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: shown === "desktop" && media.includes("min-width"),
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

type Arrangement = {
  shown: Screen;
  clientProfile: ProgramDraftClientProfile | null;
};

function renderTopBar({ shown, clientProfile }: Arrangement) {
  stubScreen(shown);
  render(
    <MemoryRouter>
      <EditorTopBar
        client={CLIENT}
        clientProfile={clientProfile}
        coachingEnded={false}
        library={null}
        onOverview={null}
        placeHeading={createRef<HTMLHeadingElement>()}
        placeTitle="Overview"
        railToggle={null}
        saving={SAVING}
        versionNumber={1}
      />
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function facts(dialog: HTMLElement): string[] {
  const terms = within(dialog).getAllByRole("term");
  const details = within(dialog).getAllByRole("definition");

  return terms.map(
    (term, index) => `${term.textContent}: ${details[index].textContent}`,
  );
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the client profile in the editor's top bar", () => {
  it("opens from its icon with her name and the six coaching answers", async () => {
    // arrange
    const user = renderTopBar({ shown: "desktop", clientProfile: PROFILE });

    // act
    await user.click(screen.getByRole("button", { name: "Client profile" }));

    // assert
    const dialog = screen.getByRole("dialog", { name: "Jane Doe" });
    expect(
      within(dialog).getByRole("heading", { name: "Jane Doe" }),
    ).toBeInTheDocument();
    expect(facts(dialog)).toEqual([
      "Goal: Build strength",
      "Equipment: Dumbbells, Resistance bands",
      "Place: Home",
      "Days per week: 5+ days",
      "Minutes per session: 45 min",
      "Limitations: Sore left knee",
    ]);
  });

  it("leaves out an answer she has not given", async () => {
    // arrange
    const user = renderTopBar({
      shown: "desktop",
      clientProfile: {
        ...PROFILE,
        goal: null,
        equipment: [],
        trainingPlace: null,
        limitations: "",
      },
    });

    // act
    await user.click(screen.getByRole("button", { name: "Client profile" }));

    // assert
    expect(facts(screen.getByRole("dialog", { name: "Jane Doe" }))).toEqual([
      "Days per week: 5+ days",
      "Minutes per session: 45 min",
    ]);
  });

  it("says there are no coaching answers yet when she has none", async () => {
    // arrange
    const user = renderTopBar({ shown: "desktop", clientProfile: null });

    // act
    await user.click(screen.getByRole("button", { name: "Client profile" }));

    // assert
    expect(
      within(screen.getByRole("dialog", { name: "Jane Doe" })).getByText(
        "No coaching answers yet.",
      ),
    ).toBeInTheDocument();
  });

  it("closes on Escape, returning focus to its icon", async () => {
    // arrange
    const user = renderTopBar({ shown: "desktop", clientProfile: PROFILE });
    const icon = screen.getByRole("button", { name: "Client profile" });
    await user.click(icon);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(icon).toHaveFocus());
  });

  it("is an item of the draft actions menu on a phone, returning focus to the menu once closed", async () => {
    // arrange
    const user = renderTopBar({ shown: "phone", clientProfile: PROFILE });
    expect(
      screen.queryByRole("button", { name: "Client profile" }),
    ).not.toBeInTheDocument();
    const menu = screen.getByRole("button", { name: "Draft actions" });
    await user.click(menu);

    // act
    await user.click(
      await screen.findByRole("menuitem", { name: "Client profile" }),
    );

    // assert
    const dialog = await screen.findByRole("dialog", { name: "Jane Doe" });
    expect(facts(dialog)).toContain("Goal: Build strength");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(menu).toHaveFocus());
  });
});
