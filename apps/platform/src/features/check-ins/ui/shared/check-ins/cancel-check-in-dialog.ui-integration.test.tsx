// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "~/shared/design-system/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { configureAxe } from "vitest-axe";

import { clientAction as cancelCheckIn } from "~/features/check-ins/api/shared/cancellation";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import { CancelCheckInDialog } from "./cancel-check-in-dialog";
import {
  CheckInDecisionOutcomes,
  useCheckInDecisions,
} from "./check-in-decisions";

const TIME_ZONE = "Europe/Bucharest";
const PAGE_PATH = "/client/checkins";
const CHECK_IN_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const TITLE = "Cancel this check-in?";

const CANCELLATION_URL = `*${CHECK_INS_API_PATHS.cancellation}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

let listingReads = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listingReads = 0;
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("cancelling an approved check-in", () => {
  it("asks first, naming the check-in, with a way to keep it", async () => {
    // arrange
    const user = await renderDialogHost();

    // act
    await user.click(openerButton());

    // assert
    const dialog = await screen.findByRole("dialog", { name: TITLE });
    expect(dialog).toHaveAccessibleDescription("Wed, Oct 14 at 10:00 AM.");
    expect(
      within(dialog)
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(expect.arrayContaining(["Keep", "Cancel check-in"]));
  });

  it("keeps the check-in, handing focus back to the action that opened it", async () => {
    // arrange
    const cancellations = answerCancellations(() =>
      HttpResponse.json({ status: "cancelled", checkInId: CHECK_IN_ID }),
    );
    const user = await renderDialogHost();
    await user.click(openerButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });

    // act
    await user.click(within(dialog).getByRole("button", { name: "Keep" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(openerButton()).toHaveFocus();
    expect(cancellations).toEqual([]);
  });

  it("cancels it from her time zone once she confirms, and says so", async () => {
    // arrange
    const cancellations = answerCancellations(() =>
      HttpResponse.json({ status: "cancelled", checkInId: CHECK_IN_ID }),
    );
    const user = await renderDialogHost();
    await user.click(openerButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(await screen.findByText("Check-in cancelled")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(cancellations).toEqual([
      { checkInId: CHECK_IN_ID, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it("says the check-in is no longer upcoming when it was refused, and reads the check-ins again", async () => {
    // arrange
    answerCancellations(() =>
      HttpResponse.json({ error: "not_pending" }, { status: 409 }),
    );
    const user = await renderDialogHost();
    await user.click(openerButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });
    const readsBefore = listingReads;

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(
      await screen.findByText("This check-in is no longer upcoming."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listingReads).toBeGreaterThan(readsBefore);
    });
  });

  it("asks her to try again when the server could not answer", async () => {
    // arrange
    server.use(http.post(CANCELLATION_URL, () => HttpResponse.error()));
    const user = await renderDialogHost();
    await user.click(openerButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(
      await screen.findByText("The check-in wasn't cancelled. Try again."),
    ).toBeInTheDocument();
  });

  it("passes the axe checks while asking", async () => {
    // arrange
    const { baseElement, user } = await renderDialogHostWithView();
    await user.click(openerButton());
    await screen.findByRole("dialog", { name: TITLE });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

function answerCancellations(
  answer: () => Response,
): { checkInId: string; body: unknown }[] {
  const received: { checkInId: string; body: unknown }[] = [];
  server.use(
    http.post(CANCELLATION_URL, async ({ params, request }) => {
      received.push({
        checkInId: String(params.checkInId),
        body: await request.json(),
      });
      return answer();
    }),
  );

  return received;
}

function openerButton(): HTMLElement {
  return screen.getByRole("button", { name: "Cancel" });
}

function DialogHost() {
  const decisions = useCheckInDecisions({ timeZone: TIME_ZONE });
  const [openings, setOpenings] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <main aria-label="Portal content">
      <h1>Check-ins</h1>
      <button
        onClick={() => {
          setOpenings((count) => count + 1);
          setOpen(true);
        }}
        type="button"
      >
        Cancel
      </button>
      {openings > 0 && (
        <CancelCheckInDialog
          cancellation={{
            checkInId: CHECK_IN_ID,
            description: "Wed, Oct 14 at 10:00 AM.",
            successMessage: "Check-in cancelled",
          }}
          decisions={decisions}
          key={openings}
          onOpenChange={setOpen}
          open={open}
        />
      )}
      <CheckInDecisionOutcomes decisions={decisions} />
    </main>
  );
}

async function renderDialogHost() {
  const { user } = await renderDialogHostWithView();

  return user;
}

async function renderDialogHostWithView() {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: DialogHost,
        loader: () => {
          listingReads += 1;
          return null;
        },
        path: PAGE_PATH,
      },
      {
        action: frameworkModeAction(cancelCheckIn),
        path: CHECK_INS_API_PATHS.cancellation,
      },
    ],
    { initialEntries: [PAGE_PATH] },
  );

  const view = render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Check-ins" });

  return { ...view, user };
}
