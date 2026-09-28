// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CLIENT_PORTAL_PATH } from "~/features/accounts/contracts/paths";
import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import {
  CLIENT_ANSWER_QUERY,
  CLIENT_ONBOARDING_PATH,
} from "~/features/coaching-sales/contracts/paths";

import { ProgramStatusCard } from "./program-status-card";

const SUBMITTED_AT = "2026-10-01T09:00:00.000Z";
const WORK_STARTS_ON = "2026-10-11T22:30:00.000Z";
const WAITING_LINE =
  "Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on 12 October. Your program will be delivered as soon as it is completed.";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function readerIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function statusOf(
  kind: ProgramStatus["kind"],
  workStartsOn: string | null = null,
): ProgramStatus {
  return { kind, submittedAt: SUBMITTED_AT, workStartsOn };
}

type CardProps = Parameters<typeof ProgramStatusCard>[0];

function renderCard(props: CardProps) {
  const router = createMemoryRouter(
    [
      { element: <ProgramStatusCard {...props} />, path: CLIENT_PORTAL_PATH },
      {
        element: <h1>Answer page</h1>,
        path: CLIENT_ONBOARDING_PATH,
      },
    ],
    { initialEntries: [CLIENT_PORTAL_PATH] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

describe("the program status card once her answers are sent", () => {
  it("labels the section, names her onboarding as sent and tells her Eli will start soon", () => {
    // arrange, act
    renderCard({ status: statusOf("submitted") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to your coach")).toBeInTheDocument();
    expect(
      screen.getByText("Eli has your answers and will start on them soon."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
  });

  it("tells her the date Eli starts on when she kept her right of withdrawal, in her own time zone", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("submitted", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});

describe("the program status card while her coach reviews her answers", () => {
  it("says her coach is reviewing and that the next step appears here", () => {
    // arrange, act
    renderCard({ status: statusOf("in-review") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your coach is reviewing your answers"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You'll see the next step here as soon as she has looked through your answers.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the date Eli starts on while she waits out her 14 days", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("in-review", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});

describe("the program status card when her coach needs more details", () => {
  it("says her coach needs more details and quotes what she asked", () => {
    // arrange, act
    renderCard({
      request: { note: "Tell me more about your knee." },
      status: statusOf("needs-details", WORK_STARTS_ON),
    });

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your coach needs a few more details"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell me more about your knee."),
    ).toBeInTheDocument();
    expect(screen.queryByText(WAITING_LINE)).not.toBeInTheDocument();
  });

  it("opens the answer page from Answer now", async () => {
    // arrange
    const user = userEvent.setup();
    const router = renderCard({
      request: { note: "Tell me more about your knee." },
      status: statusOf("needs-details"),
    });
    const answerNow = screen.getByRole("link", { name: "Answer now" });

    // act
    await user.click(answerNow);

    // assert
    expect(answerNow).toHaveAttribute(
      "href",
      `${CLIENT_ONBOARDING_PATH}?${CLIENT_ANSWER_QUERY}`,
    );
    expect(
      await screen.findByRole("heading", { name: "Answer page" }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?${CLIENT_ANSWER_QUERY}`);
  });
});

describe("the program status card once her answers are approved", () => {
  it("moves on to her program and says Eli is putting it together", () => {
    // arrange, act
    renderCard({ request: null, status: statusOf("approved") });

    // assert
    expect(
      screen.getByRole("region", { name: "Your program" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Your answers are approved")).toBeInTheDocument();
    expect(
      screen.getByText("Eli is putting your program together."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the date Eli starts on while she waits out her 14 days", () => {
    // arrange
    readerIsIn("Europe/Bucharest");

    // act
    renderCard({ status: statusOf("approved", WORK_STARTS_ON) });

    // assert
    expect(screen.getByText(WAITING_LINE)).toBeInTheDocument();
  });
});
