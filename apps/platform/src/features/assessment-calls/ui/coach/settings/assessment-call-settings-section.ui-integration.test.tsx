// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";

import type { AssessmentCallSettings } from "~/features/assessment-calls/contracts/assessment-call-settings";
import { ASSESSMENT_CALL_API_PATHS } from "~/features/assessment-calls/contracts/paths";

import { AssessmentCallSettingsSection } from "./assessment-call-settings-section";
import { ErrorBoundary as CoachSettingsErrorBoundary } from "./settings-page";

const SETTINGS_URL = ASSESSMENT_CALL_API_PATHS.settings;

const DEFAULT_SETTINGS: AssessmentCallSettings = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
  meetingLink: null,
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("assessment call settings section", () => {
  it("shows the loaded defaults", async () => {
    // arrange, act
    await renderSection();

    // assert
    expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Friday" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Saturday" }),
    ).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: "Start" })).toHaveTextContent(
      "17:00",
    );
    expect(screen.getByRole("combobox", { name: "End" })).toHaveTextContent(
      "20:00",
    );
    expect(screen.getByLabelText("Meeting link")).toHaveValue("");
    expect(
      screen.getByText("Visitors cannot join calls until a link is set."),
    ).toBeInTheDocument();
  });

  it("shows and hides the no-link warning as the link field changes", async () => {
    // arrange
    const user = userEvent.setup();
    await renderSection();
    const link = screen.getByLabelText("Meeting link");

    // act
    await user.type(link, "https://meet.example/eli-room");

    // assert
    expect(
      screen.queryByText("Visitors cannot join calls until a link is set."),
    ).not.toBeInTheDocument();

    // act
    await user.clear(link);

    // assert
    expect(
      screen.getByText("Visitors cannot join calls until a link is set."),
    ).toBeInTheDocument();
  });

  it("refuses to submit with every weekday unchecked, keeping the rest of the form", async () => {
    // arrange
    const user = userEvent.setup();
    await renderSection();

    // act
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]) {
      await user.click(screen.getByRole("checkbox", { name: day }));
    }
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(await screen.findByText("Pick at least one day.")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByRole("combobox", { name: "Start" })).toHaveTextContent(
      "17:00",
    );
  });

  it("refuses an https-only meeting link and keeps the entered value", async () => {
    // arrange
    const user = userEvent.setup();
    await renderSection();
    const link = screen.getByLabelText("Meeting link");

    // act
    await user.type(link, "ftp://meet.example/eli");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a full https:// link, or leave it empty.",
    );
    expect(link).toHaveValue("ftp://meet.example/eli");
  });

  it("shows the server's ordering refusal beside the hours and keeps every entered value", async () => {
    // arrange
    server.use(
      http.put(SETTINGS_URL, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "invalid_hours",
              message: "The start hour must be before the end hour.",
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    await renderSection();
    const link = screen.getByLabelText("Meeting link");

    // act
    await user.type(link, "https://meet.example/eli-room");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The start hour must be before the end hour.",
    );
    expect(link).toHaveValue("https://meet.example/eli-room");
    expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
  });

  it("saves valid values, sends the browser zone, and shows the success toast", async () => {
    // arrange
    let sentBody: unknown;
    server.use(
      http.put(SETTINGS_URL, async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json({
          success: true,
          settings: sentBody,
        });
      }),
    );
    const user = userEvent.setup();
    await renderSection();
    const link = screen.getByLabelText("Meeting link");

    // act
    await user.type(link, "https://meet.example/eli-room");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    await waitFor(() => {
      expect(screen.getByText("Settings saved")).toBeInTheDocument();
    });
    expect(sentBody).toMatchObject({
      meetingLink: "https://meet.example/eli-room",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  });

  it("shows an error toast and keeps entered values on a server failure", async () => {
    // arrange
    server.use(
      http.put(SETTINGS_URL, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "server_error",
              message: "We couldn't save your settings. Try again in a moment.",
            },
          },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    await renderSection();
    const link = screen.getByLabelText("Meeting link");

    // act
    await user.type(link, "https://meet.example/eli-room");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't save your settings. Try again in a moment.",
        ),
      ).toBeInTheDocument();
    });
    expect(link).toHaveValue("https://meet.example/eli-room");
  });

  it("surfaces a forbidden save as an error toast", async () => {
    // arrange
    server.use(
      http.put(SETTINGS_URL, () =>
        HttpResponse.json({ error: "forbidden" }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    await renderSection();

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't save your settings. Try again in a moment.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("surfaces an unauthenticated save as an error toast", async () => {
    // arrange
    server.use(
      http.put(SETTINGS_URL, () =>
        HttpResponse.json({ error: "unauthenticated" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    await renderSection();

    // act
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    // assert
    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't save your settings. Try again in a moment.",
        ),
      ).toBeInTheDocument();
    });
  });
});

async function renderSection(
  settings: AssessmentCallSettings = DEFAULT_SETTINGS,
) {
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [
          {
            Component: () => (
              <AssessmentCallSettingsSection settings={settings} />
            ),
            ErrorBoundary: CoachSettingsErrorBoundary,
            index: true,
            loader: () => settings,
          },
        ],
        path: "/coach/settings",
      },
      {
        action: async ({ request }: { request: Request }) => {
          const response = await fetch(request);

          if (response.status === 401 || response.status === 403) {
            throw response;
          }

          return response;
        },
        path: SETTINGS_URL,
      },
    ],
    { initialEntries: ["/coach/settings"] },
  );

  render(<RouterProvider router={router} />);

  await screen.findByRole("heading", { name: "Assessment calls" });
}
