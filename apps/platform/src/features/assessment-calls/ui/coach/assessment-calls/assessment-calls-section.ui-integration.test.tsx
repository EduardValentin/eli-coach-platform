// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";
import type { ClassifiedCall } from "~/features/assessment-calls/ui/coach/assessment-call-listing";

import {
  AssessmentCallsSection,
  type EndedCallExtras,
  type ToolbarFilter,
} from "./assessment-calls-section";

const TIME_ZONE = "Europe/Bucharest";
const NOW = new Date("2026-09-20T09:00:00.000Z");
const FLAG_PARAM = "flag";

function callStartingAt(
  id: string,
  startsAt: string,
  fullName: string,
): CoachAssessmentCall {
  const starts = new Date(startsAt);
  const [firstName, lastName] = fullName.split(" ");

  return {
    bookedAt: "2026-09-10T09:00:00.000Z",
    country: "RO",
    dateOfBirth: "1994-03-14",
    endsAt: new Date(starts.getTime() + 30 * 60_000).toISOString(),
    firstName,
    fullName,
    gender: "female",
    id,
    joinPath: `/book/${id}/join`,
    lastName,
    phone: null,
    primaryGoal: "build_strength",
    startsAt: starts.toISOString(),
    visitorEmail: `${firstName.toLowerCase()}@example.com`,
    visitorNotes: null,
  };
}

const CALLS = [
  callStartingAt("yesterday", "2026-09-19T15:00:00.000Z", "Bea Ionescu"),
  callStartingAt("earlier-today", "2026-09-20T05:00:00.000Z", "Carla Marin"),
  callStartingAt("later-today", "2026-09-20T15:00:00.000Z", "Ana Popescu"),
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the assessment calls section on its own", () => {
  it("leaves an ended call without a badge or an action", async () => {
    // arrange, act
    await renderSection({ url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past` });

    // assert
    for (const shown of shownCalls().map((item) => within(item))) {
      expect(shown.queryByText("Call held")).not.toBeInTheDocument();
      expect(shown.queryByRole("button")).not.toBeInTheDocument();
      expect(shown.queryByRole("link", { name: "Join call" })).toBeNull();
    }
  });
});

describe("the ended-call slot", () => {
  const extras = (call: ClassifiedCall): EndedCallExtras => ({
    action: <button type="button">Follow up {call.fullName}</button>,
    badge: <span>Flagged</span>,
  });

  it("adds its badge and action to each ended call only", async () => {
    // arrange, act
    await renderSection({ renderEndedCallExtras: extras });

    // assert
    const [laterToday, earlierToday, yesterday] = shownCalls().map((item) =>
      within(item),
    );

    for (const ended of [earlierToday, yesterday]) {
      expect(ended.getByText("Flagged")).toBeInTheDocument();
      expect(ended.getByRole("button", { name: /^Follow up/ })).toBeVisible();
    }
    expect(laterToday.queryByText("Flagged")).not.toBeInTheDocument();
    expect(laterToday.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps Today and the join link on a call still to come", async () => {
    // arrange, act
    await renderSection({ renderEndedCallExtras: extras });

    // assert
    const laterToday = within(shownCalls()[0]);

    expect(laterToday.getByText("Today")).toBeInTheDocument();
    expect(
      laterToday.getByRole("link", { name: "Join call" }),
    ).toBeInTheDocument();
  });
});

describe("the toolbar filter slot", () => {
  const flaggedFilter = {
    control: (scopedCalls: readonly ClassifiedCall[]) => (
      <p>{scopedCalls.length} calls in view</p>
    ),
    label: "Flagged",
    params: [FLAG_PARAM],
  };

  function idleFlaggedFilter(): ToolbarFilter {
    return { ...flaggedFilter, isActive: false, matches: () => true };
  }

  function appliedFlaggedFilter(): ToolbarFilter {
    return {
      ...flaggedFilter,
      isActive: true,
      matches: (call) => call.id === "yesterday",
    };
  }

  it("hands its control the calls the window and the search leave", async () => {
    // arrange, act
    await renderSection({
      toolbarFilter: idleFlaggedFilter(),
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=today&q=carla`,
    });

    // assert
    expect(screen.getByText("1 calls in view")).toBeInTheDocument();
  });

  it("narrows the calls the window and the search leave", async () => {
    // arrange, act
    await renderSection({ toolbarFilter: appliedFlaggedFilter() });

    // assert
    expect(shownCallNames()).toEqual(["Bea Ionescu"]);
  });

  it("names its label when it leaves nothing and clears its own parameters with the rest", async () => {
    // arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { router } = await renderSection({
      toolbarFilter: appliedFlaggedFilter(),
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=upcoming&${FLAG_PARAM}=on&sort=name`,
    });

    const emptyMessage = screen.getByText(
      "No upcoming calls match the Flagged status.",
    );

    // act
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    expect(emptyMessage).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe("?sort=name");
    });
  });
});

function shownCalls(): HTMLElement[] {
  return within(
    screen.getByRole("list", { name: "Assessment calls" }),
  ).getAllByRole("listitem");
}

function shownCallNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "");
}

async function renderSection(options: {
  renderEndedCallExtras?: (call: ClassifiedCall) => EndedCallExtras;
  toolbarFilter?: ToolbarFilter;
  url?: string;
}) {
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <AssessmentCallsSection
            calls={CALLS}
            now={NOW}
            renderEndedCallExtras={options.renderEndedCallExtras}
            timeZone={TIME_ZONE}
            toolbarFilter={options.toolbarFilter}
          />
        ),
        path: COACH_ASSESSMENT_CALLS_PATH,
      },
    ],
    { initialEntries: [options.url ?? COACH_ASSESSMENT_CALLS_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("tablist", { name: "When" });

  return { router };
}
