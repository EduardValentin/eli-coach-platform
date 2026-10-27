// @vitest-environment happy-dom

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
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
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

import { clientAction as saveCoachProfile } from "~/features/client-profile/api/coach/coach-client-profile";
import { clientAction as writeCoachAvatar } from "~/features/client-profile/api/coach/coach-client-avatar";
import type { ClientProfileView } from "~/features/client-profile/public/client-profile";
import { clientAction as saveIdentity } from "~/features/clients/api/coach/coach-client-identity";
import {
  COACH_CLIENT_PROFILE_ROUTE_SEGMENT,
  coachClientPath,
  coachClientProfilePath,
} from "~/features/clients/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import CoachClientProfileRoute, { ErrorBoundary } from "./client-profile";

const COACH_TIME_ZONE = "Europe/Bucharest";
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const IDENTITY_URL = `http://localhost/api/clients/${CLIENT_ID}/identity`;
const COACHING_URL = `http://localhost/api/client-profile/coach/${CLIENT_ID}`;
const AVATAR_URL = `${COACHING_URL}/avatar`;
const SAVED = "Changes saved";
const UNSAVED = "Your changes weren't saved. Try again.";

const BEFORE_APPROVAL: ClientProfileView = {
  identity: {
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40712345678",
  },
  coaching: null,
  coachNotes: null,
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarUrl: null,
  startingWeightKg: null,
  currentWeightKg: null,
};

const APPROVED: ClientProfileView = {
  ...BEFORE_APPROVAL,
  coaching: {
    heightCm: 165,
    trainingDays: 3,
    sessionMinutes: 60,
    equipment: ["Full gym"],
    trainingPlace: "Gym",
    limitations: "Left shoulder",
    level: "beginner",
    primaryGoal: "Lose fat",
    goalWeightKg: 62,
    activityLevel: "Lightly active",
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  coachNotes: "Prefers mornings.",
  preferences: { preferredCheckInWeekday: "monday", preferredChannel: "email" },
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  coachIsIn(COACH_TIME_ZONE);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the coach's client profile page", () => {
  it("heads the page with her name over Profile, under a way back to her page", async () => {
    // arrange, act
    await renderProfilePage({ profile: APPROVED });

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Ana Popescu" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    const picture = screen.getByRole("region", { name: "Ana Popescu" });
    expect(within(picture).getByText("ana@example.com")).toBeInTheDocument();
    expect(
      within(picture).getByLabelText("Upload picture"),
    ).toBeInTheDocument();
  });

  it("says her coaching facts fill in once her answers are approved and leaves her preferences out", async () => {
    // arrange, act
    await renderProfilePage({ profile: BEFORE_APPROVAL });

    // assert
    const coaching = screen.getByRole("region", { name: "Coaching" });
    expect(
      within(coaching).getByText(
        "These fill in once her answers are approved.",
      ),
    ).toBeInTheDocument();
    expect(within(coaching).queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Preferences" }),
    ).not.toBeInTheDocument();
  });

  it("fills her coaching facts in the coach's units and reads her preferences", async () => {
    // arrange, act
    await renderProfilePage({ profile: APPROVED });

    // assert
    const coaching = screen.getByRole("region", { name: "Coaching" });
    expect(
      within(coaching).getByRole("spinbutton", { name: /^Height/ }),
    ).toHaveValue(165);
    expect(
      within(coaching).getByRole("spinbutton", { name: /^Goal weight/ }),
    ).toHaveValue(62);
    expect(
      within(coaching).getByRole("radio", { name: "3 days" }),
    ).toBeChecked();
    expect(
      within(coaching).getByRole("checkbox", { name: "Full gym" }),
    ).toBeChecked();
    expect(
      within(coaching).getByRole("textbox", { name: /^Coach notes/ }),
    ).toHaveValue("Prefers mornings.");
    const preferences = screen.getByRole("region", { name: "Preferences" });
    expect(within(preferences).getByText("Monday")).toBeInTheDocument();
    expect(within(preferences).getByText("Email")).toBeInTheDocument();
  });

  it("leaves the cycle mode out for a man", async () => {
    // arrange, act
    await renderProfilePage({
      profile: {
        ...APPROVED,
        identity: { ...APPROVED.identity, gender: "male" },
      },
    });

    // assert
    expect(
      screen.queryByRole("group", { name: /^Cycle mode/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the coach's unsaved coaching changes when a change of gender is saved", async () => {
    // arrange
    const loaded = { profile: APPROVED };
    recordJsonRequests("put", IDENTITY_URL, () => {
      loaded.profile = {
        ...APPROVED,
        identity: { ...APPROVED.identity, gender: "male" },
      };

      return HttpResponse.json({ status: "saved" });
    });
    const user = await renderProfilePage(loaded);
    const about = screen.getByRole("region", { name: "About her" });
    const coaching = screen.getByRole("region", { name: "Coaching" });
    await user.type(
      within(coaching).getByRole("textbox", { name: /^Limitations/ }),
      " and right knee",
    );

    // act
    await user.click(within(about).getByRole("radio", { name: "Male" }));
    await user.click(
      within(about).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(SAVED)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("group", { name: /^Cycle mode/ }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("region", { name: "Coaching" })).getByRole(
        "textbox",
        { name: /^Limitations/ },
      ),
    ).toHaveValue("Left shoulder and right knee");
  });

  it("keeps her email read-only and says why when the coach asks", async () => {
    // arrange
    const user = await renderProfilePage({ profile: APPROVED });

    // act
    await user.hover(
      screen.getByRole("button", { name: "Why the email can't be changed" }),
    );

    // assert
    expect(
      await screen.findByText(
        "She signs in and pays with this address, so it can't be changed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /email/i }),
    ).not.toBeInTheDocument();
  });

  it("saves what the coach changes about her and confirms it", async () => {
    // arrange
    const saves = recordJsonRequests("put", IDENTITY_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About her" });
    const save = within(about).getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    // act
    await user.clear(
      within(about).getByRole("textbox", { name: /^First name/ }),
    );
    await user.type(
      within(about).getByRole("textbox", { name: /^First name/ }),
      "Anna",
    );
    await user.click(save);

    // assert
    expect(await screen.findByText(SAVED)).toBeInTheDocument();
    expect(saves).toEqual([
      {
        country: "RO",
        dateOfBirth: "1994-03-14",
        firstName: "Anna",
        gender: "female",
        lastName: "Popescu",
        phoneCountry: "RO",
        phoneNumber: "712345678",
      },
    ]);
    expect(save).toBeDisabled();
  });

  it("explains a missing first name at the field without sending anything", async () => {
    // arrange
    const saves = recordJsonRequests("put", IDENTITY_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About her" });

    // act
    await user.clear(
      within(about).getByRole("textbox", { name: /^First name/ }),
    );
    await user.click(
      within(about).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(
      within(about).getByRole("textbox", { name: /^First name/ }),
    ).toHaveAccessibleDescription("Enter an answer.");
    expect(saves).toEqual([]);
  });

  it("explains a phone number the server refuses at the field and keeps what she entered", async () => {
    // arrange
    recordJsonRequests("put", IDENTITY_URL, () =>
      HttpResponse.json({ problems: { phone: "invalid" } }, { status: 422 }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About her" });
    await user.type(
      within(about).getByRole("textbox", { name: /^Last name/ }),
      "-Ionescu",
    );

    // act
    await user.click(
      within(about).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(
      await within(about).findByText(
        "Enter a phone number with digits only, 4 to 14 digits after the country code.",
      ),
    ).toBeInTheDocument();
    expect(
      within(about).getByRole("textbox", { name: /^Last name/ }),
    ).toHaveValue("Popescu-Ionescu");
  });

  it("saves her coaching facts in metric with the coach notes", async () => {
    // arrange
    const saves = recordJsonRequests("put", COACHING_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const coaching = screen.getByRole("region", { name: "Coaching" });

    // act
    await user.click(
      within(coaching).getByRole("checkbox", { name: "Bodyweight only" }),
    );
    await user.click(
      within(coaching).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(SAVED)).toBeInTheDocument();
    expect(saves).toEqual([
      {
        coaching: {
          activityLevel: "Lightly active",
          cycleMode: "adapted",
          dietaryRestrictions: "None",
          equipment: ["Bodyweight only"],
          goalWeightKg: 62,
          heightCm: 165,
          level: "beginner",
          limitations: "Left shoulder",
          primaryGoal: "Lose fat",
          sessionMinutes: 60,
          trainingDays: 3,
          trainingPlace: "Gym",
        },
        coachNotes: "Prefers mornings.",
      },
    ]);
  });

  it("explains a height out of range at the field without sending anything", async () => {
    // arrange
    const saves = recordJsonRequests("put", COACHING_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const coaching = screen.getByRole("region", { name: "Coaching" });
    const height = within(coaching).getByRole("spinbutton", {
      name: /^Height/,
    });

    // act
    await user.clear(height);
    await user.type(height, "300");
    await user.click(
      within(coaching).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(height).toHaveAccessibleDescription(
      "Enter a height between 120 and 230 cm.",
    );
    expect(saves).toEqual([]);
  });

  it("explains coach notes past 500 characters at the field without sending anything", async () => {
    // arrange
    const saves = recordJsonRequests("put", COACHING_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const coaching = screen.getByRole("region", { name: "Coaching" });
    const notes = within(coaching).getByRole("textbox", {
      name: /^Coach notes/,
    });
    await user.clear(notes);
    await user.click(notes);
    await user.paste("a".repeat(501));

    // act
    await user.click(
      within(coaching).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(notes).toHaveAccessibleDescription(
      "Only you see these. Keep it to 500 characters or fewer.",
    );
    expect(saves).toEqual([]);
  });

  it("explains what each cycle mode means when the coach asks", async () => {
    // arrange
    const user = await renderProfilePage({ profile: APPROVED });

    // act
    await user.hover(
      screen.getByRole("button", { name: "What cycle mode means" }),
    );

    // assert
    expect(
      await screen.findByText(
        "— no cycle-driven adjustments; the low-energy session stays available.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the coach's notes and says they weren't saved when the save is refused", async () => {
    // arrange
    recordJsonRequests("put", COACHING_URL, () =>
      HttpResponse.json({ error: "changed-meanwhile" }, { status: 409 }),
    );
    const user = await renderProfilePage({ profile: APPROVED });
    const coaching = screen.getByRole("region", { name: "Coaching" });
    const notes = within(coaching).getByRole("textbox", {
      name: /^Coach notes/,
    });

    // act
    await user.type(notes, " Works nights.");
    await user.click(
      within(coaching).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(UNSAVED)).toBeInTheDocument();
    expect(notes).toHaveValue("Prefers mornings. Works nights.");
  });
});

describe("her picture on the coach's profile page", () => {
  it("uploads a picture the coach chooses and confirms it", async () => {
    // arrange
    const uploads = recordUploads("post");
    const user = await renderProfilePage({ profile: APPROVED });

    // act
    await user.upload(
      screen.getByLabelText("Upload picture"),
      new File(["png"], "ana.png", { type: "image/png" }),
    );

    // assert
    expect(
      await screen.findByText("Profile picture updated"),
    ).toBeInTheDocument();
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatch(/name="avatar"; filename=/);
  });

  it("refuses a file that is not a picture without sending it", async () => {
    // arrange
    const uploads = recordUploads("post");
    const user = await renderProfilePage(
      { profile: APPROVED },
      { applyAccept: false },
    );

    // act
    await user.upload(
      screen.getByLabelText("Upload picture"),
      new File(["%PDF"], "plan.pdf", { type: "application/pdf" }),
    );

    // assert
    expect(
      await screen.findByText("Choose a JPEG, PNG or WebP under 10 MB."),
    ).toBeInTheDocument();
    expect(uploads).toEqual([]);
  });

  it("says the picture wasn't saved when the upload fails", async () => {
    // arrange
    server.use(
      http.post(AVATAR_URL, () =>
        HttpResponse.json({ error: "ended" }, { status: 409 }),
      ),
    );
    const user = await renderProfilePage({ profile: APPROVED });

    // act
    await user.upload(
      screen.getByLabelText("Upload picture"),
      new File(["png"], "ana.png", { type: "image/png" }),
    );

    // assert
    expect(
      await screen.findByText("The picture wasn't saved. Try again."),
    ).toBeInTheDocument();
  });

  it("removes her picture once the coach confirms", async () => {
    // arrange
    const removals = recordUploads("delete");
    const user = await renderProfilePage({
      profile: {
        ...APPROVED,
        avatarUrl: `/api/client-profile/avatar/${CLIENT_ID}`,
      },
    });
    const picture = screen.getByRole("region", { name: "Ana Popescu" });
    expect(within(picture).getByRole("img")).toHaveAccessibleName(
      "Ana Popescu's profile picture",
    );
    await user.click(within(picture).getByRole("button", { name: "Remove" }));

    // act
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Remove the profile picture?" }),
      ).getByRole("button", { name: "Remove" }),
    );

    // assert
    expect(
      await screen.findByText("Profile picture removed"),
    ).toBeInTheDocument();
    expect(removals).toHaveLength(1);
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function recordJsonRequests(
  method: "put",
  url: string,
  answer: () => Response,
): unknown[] {
  const requests: unknown[] = [];

  server.use(
    http[method](url, async ({ request }) => {
      requests.push(await request.json());

      return answer();
    }),
  );

  return requests;
}

function recordUploads(method: "post" | "delete"): string[] {
  const requests: string[] = [];

  server.use(
    http[method](AVATAR_URL, async ({ request }) => {
      requests.push(await request.text());

      return HttpResponse.json({
        status: method === "post" ? "uploaded" : "removed",
      });
    }),
  );

  return requests;
}

async function renderProfilePage(
  loaded: { profile: ClientProfileView },
  options: Parameters<typeof userEvent.setup>[0] = {},
) {
  const user = userEvent.setup(options);
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
            Component: CoachClientProfileRoute,
            ErrorBoundary,
            loader: () => ({ clientId: CLIENT_ID, profile: loaded.profile }),
            path: `/coach/${COACH_CLIENT_PROFILE_ROUTE_SEGMENT}`,
          },
          {
            action: frameworkModeAction(saveIdentity),
            path: "/api/clients/:clientId/identity",
          },
          {
            action: frameworkModeAction(saveCoachProfile),
            path: "/api/client-profile/coach/:clientId",
          },
          {
            action: frameworkModeAction(writeCoachAvatar),
            path: "/api/client-profile/coach/:clientId/avatar",
          },
        ],
      },
    ],
    { initialEntries: [coachClientProfilePath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Profile" });

  return user;
}
