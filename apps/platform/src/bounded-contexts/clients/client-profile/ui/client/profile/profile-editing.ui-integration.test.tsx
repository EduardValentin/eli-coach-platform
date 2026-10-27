// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "~/shared/design-system/toast";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
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

import { clientAction as writeOwnAvatar } from "~/bounded-contexts/clients/client-profile/api/client/own-avatar";
import { clientAction as saveOwnProfile } from "~/bounded-contexts/clients/client-profile/api/client/own-profile";
import type { MeasurementsPage } from "~/bounded-contexts/clients/client-profile/public/measurements";
import type { OwnClientProfileView } from "~/bounded-contexts/clients/client-profile/public/own-client-profile";
import {
  CLIENT_PROFILE_API_PATHS,
  CLIENT_PROFILE_PATH,
} from "~/bounded-contexts/clients/client-profile/public/paths";
import { clientAction as saveOwnIdentity } from "~/bounded-contexts/clients/clients/api/client/own-client-identity";
import { CLIENTS_API_PATHS } from "~/bounded-contexts/clients/clients/public/paths";
import { frameworkModeAction } from "~/composition-root/test-support/framework-mode-action";

import ClientProfileRoute from "./profile-page";

const IDENTITY_URL = `http://localhost${CLIENTS_API_PATHS.ownIdentity}`;
const PROFILE_URL = `http://localhost${CLIENT_PROFILE_API_PATHS.ownProfile}`;
const AVATAR_URL = `http://localhost${CLIENT_PROFILE_API_PATHS.avatars}`;
const SAVED = "Changes saved";
const UNSAVED = "Your changes weren't saved. Try again.";

const METRIC = { weightUnit: "kg", heightUnit: "cm" } as const;
const IMPERIAL = { weightUnit: "lb", heightUnit: "ft-in" } as const;

const BEFORE_APPROVAL: OwnClientProfileView = {
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
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarUrl: null,
  startingWeightKg: 66.1,
  currentWeightKg: 66.1,
};

const APPROVED: OwnClientProfileView = {
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
    dietaryRestrictions: "Lactose",
  },
  preferences: { preferredCheckInWeekday: "monday", preferredChannel: "email" },
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  clientIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("her profile page", () => {
  it("heads the page with what she keeps up to date and her picture card", async () => {
    // arrange, act
    await renderProfile({ profile: BEFORE_APPROVAL });

    // assert
    expect(
      screen.getByText(
        "Keep your details up to date so your coach plans with the right facts.",
      ),
    ).toBeInTheDocument();
    const picture = screen.getByRole("region", { name: "Ana Popescu" });
    expect(within(picture).getByText("ana@example.com")).toBeInTheDocument();
    expect(
      within(picture).getByLabelText("Upload picture"),
    ).toBeInTheDocument();
  });

  it("offers only who she is before her answers are approved", async () => {
    // arrange, act
    await renderProfile({ profile: BEFORE_APPROVAL });

    // assert
    expect(
      screen.getByRole("region", { name: "About you" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Your training" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", {
        name: "Your coach keeps these up to date",
      }),
    ).not.toBeInTheDocument();
  });

  it("fills her training in her units once her answers are approved", async () => {
    // arrange, act
    await renderProfile({ profile: APPROVED, units: IMPERIAL });

    // assert
    const training = screen.getByRole("region", { name: "Your training" });
    expect(
      within(training).getByRole("spinbutton", { name: /^Height/ }),
    ).toHaveValue(65);
    expect(
      within(training).getByRole("radio", { name: "3 days" }),
    ).toBeChecked();
    expect(
      within(training).getByRole("radio", { name: "60 min" }),
    ).toBeChecked();
    expect(
      within(training).getByRole("checkbox", { name: "Full gym" }),
    ).toBeChecked();
    expect(
      within(training).getByRole("textbox", { name: /^Limitations/ }),
    ).toHaveValue("Left shoulder");
  });

  it("reads the facts her coach keeps, in her units, and never her coach's notes", async () => {
    // arrange, act
    await renderProfile({ profile: APPROVED, units: IMPERIAL });

    // assert
    const coachFacts = screen.getByRole("region", {
      name: "Your coach keeps these up to date",
    });
    expect(
      within(coachFacts).getByText("Mention a change at your next check-in."),
    ).toBeInTheDocument();
    expect(readingsOf(coachFacts)).toEqual([
      ["Gender", "Female"],
      ["Level", "Beginner"],
      ["Primary goal", "Lose fat"],
      ["Goal weight", "136.7 lb"],
      ["Lifestyle activity level", "Lightly active"],
      ["Cycle mode", "Adapted to symptoms"],
      ["Dietary restrictions", "Lactose"],
    ]);
    expect(screen.queryByText(/coach notes/i)).not.toBeInTheDocument();
  });

  it("leaves the cycle mode out for a man", async () => {
    // arrange, act
    await renderProfile({
      profile: {
        ...APPROVED,
        identity: { ...APPROVED.identity, gender: "male" },
      },
    });

    // assert
    const coachFacts = screen.getByRole("region", {
      name: "Your coach keeps these up to date",
    });
    expect(readingsOf(coachFacts).map(([label]) => label)).not.toContain(
      "Cycle mode",
    );
  });
});

describe("what she says about herself", () => {
  it("keeps her email read-only and says why when she asks", async () => {
    // arrange
    const user = await renderProfile({ profile: APPROVED });

    // act
    await user.hover(
      screen.getByRole("button", { name: "Why the email can't be changed" }),
    );

    // assert
    expect(
      await screen.findByText(
        "You sign in and pay with this address, so it can't be changed.",
      ),
    ).toBeInTheDocument();
    const about = screen.getByRole("region", { name: "About you" });
    expect(within(about).getByText("How you sign in.")).toBeInTheDocument();
    expect(
      within(about).queryByRole("radiogroup", { name: /^Gender/ }),
    ).not.toBeInTheDocument();
  });

  it("saves what she changes about herself without her gender and confirms it", async () => {
    // arrange
    const saves = recordJsonRequests(IDENTITY_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About you" });
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
        lastName: "Popescu",
        phoneCountry: "RO",
        phoneNumber: "712345678",
      },
    ]);
    expect(save).toBeDisabled();
  });

  it("explains a missing first name at the field without sending anything", async () => {
    // arrange
    const saves = recordJsonRequests(IDENTITY_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About you" });

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
    recordJsonRequests(IDENTITY_URL, () =>
      HttpResponse.json({ problems: { phone: "invalid" } }, { status: 422 }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About you" });
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

  it("keeps what she entered and says it wasn't saved once her coaching has ended", async () => {
    // arrange
    recordJsonRequests(IDENTITY_URL, () =>
      HttpResponse.json({ error: "ended" }, { status: 409 }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const about = screen.getByRole("region", { name: "About you" });
    await user.type(
      within(about).getByRole("textbox", { name: /^Last name/ }),
      "-Ionescu",
    );

    // act
    await user.click(
      within(about).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(UNSAVED)).toBeInTheDocument();
    expect(
      within(about).getByRole("textbox", { name: /^Last name/ }),
    ).toHaveValue("Popescu-Ionescu");
  });
});

describe("her training", () => {
  it("saves what she changes in metric and confirms it", async () => {
    // arrange
    const saves = recordJsonRequests(PROFILE_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const training = screen.getByRole("region", { name: "Your training" });

    // act
    await user.click(within(training).getByRole("radio", { name: "4 days" }));
    await user.click(
      within(training).getByRole("checkbox", { name: "Bodyweight only" }),
    );
    await user.click(
      within(training).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(SAVED)).toBeInTheDocument();
    expect(saves).toEqual([
      {
        facts: {
          equipment: ["Bodyweight only"],
          heightCm: 165,
          limitations: "Left shoulder",
          sessionMinutes: 60,
          trainingDays: 4,
          trainingPlace: "Gym",
        },
      },
    ]);
  });

  it("explains a height out of range in her units at the field without sending anything", async () => {
    // arrange
    const saves = recordJsonRequests(PROFILE_URL, () =>
      HttpResponse.json({ status: "saved" }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const training = screen.getByRole("region", { name: "Your training" });
    const height = within(training).getByRole("spinbutton", {
      name: /^Height/,
    });

    // act
    await user.clear(height);
    await user.type(height, "300");
    await user.click(
      within(training).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(height).toHaveAccessibleDescription(
      "Enter a height between 120 and 230 cm.",
    );
    expect(saves).toEqual([]);
  });

  it("explains limitations the server finds too long at the field", async () => {
    // arrange
    recordJsonRequests(PROFILE_URL, () =>
      HttpResponse.json(
        { problems: { limitations: "too-long" } },
        { status: 422 },
      ),
    );
    const user = await renderProfile({ profile: APPROVED });
    const training = screen.getByRole("region", { name: "Your training" });
    await user.type(
      within(training).getByRole("textbox", { name: /^Limitations/ }),
      " and knee",
    );

    // act
    await user.click(
      within(training).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(
      await within(training).findByText("Keep it to 500 characters or fewer."),
    ).toBeInTheDocument();
  });

  it("keeps what she entered and says it wasn't saved when the profile moved meanwhile", async () => {
    // arrange
    recordJsonRequests(PROFILE_URL, () =>
      HttpResponse.json({ error: "changed-meanwhile" }, { status: 409 }),
    );
    const user = await renderProfile({ profile: APPROVED });
    const training = screen.getByRole("region", { name: "Your training" });
    const limitations = within(training).getByRole("textbox", {
      name: /^Limitations/,
    });

    // act
    await user.type(limitations, " and knee");
    await user.click(
      within(training).getByRole("button", { name: "Save changes" }),
    );

    // assert
    expect(await screen.findByText(UNSAVED)).toBeInTheDocument();
    expect(limitations).toHaveValue("Left shoulder and knee");
  });
});

describe("her picture", () => {
  it("uploads the picture she chooses and confirms it", async () => {
    // arrange
    const uploads = recordAvatarWrites("post");
    const user = await renderProfile({ profile: APPROVED });

    // act
    await user.upload(
      screen.getByLabelText("Upload picture"),
      new File(["png"], "me.png", { type: "image/png" }),
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
    const uploads = recordAvatarWrites("post");
    const user = await renderProfile(
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

  it("removes her picture once she confirms", async () => {
    // arrange
    const removals = recordAvatarWrites("delete");
    const user = await renderProfile({
      profile: {
        ...APPROVED,
        avatarUrl: "/api/client-profile/avatar/client-ana?v=avatar-1",
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

function clientIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function readingsOf(region: HTMLElement): [string, string][] {
  return within(region)
    .getAllByRole("term")
    .map((term) => [
      term.textContent ?? "",
      term.nextElementSibling?.textContent ?? "",
    ]);
}

function recordJsonRequests(url: string, answer: () => Response): unknown[] {
  const requests: unknown[] = [];

  server.use(
    http.put(url, async ({ request }) => {
      requests.push(await request.json());

      return answer();
    }),
  );

  return requests;
}

function recordAvatarWrites(method: "post" | "delete"): string[] {
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

function measurementsIn(
  units: MeasurementsPage["units"] = METRIC,
): MeasurementsPage {
  return { history: [], consentedAt: null, units, dueLine: null };
}

async function renderProfile(
  loaded: {
    profile: OwnClientProfileView;
    units?: MeasurementsPage["units"];
  },
  options: Parameters<typeof userEvent.setup>[0] = {},
) {
  const user = userEvent.setup(options);
  const router = createMemoryRouter(
    [
      {
        Component: ClientProfileRoute,
        loader: () => ({
          measurements: measurementsIn(loaded.units),
          profile: loaded.profile,
        }),
        path: CLIENT_PROFILE_PATH,
      },
      {
        action: frameworkModeAction(saveOwnIdentity),
        path: CLIENTS_API_PATHS.ownIdentity,
      },
      {
        action: frameworkModeAction(saveOwnProfile),
        path: CLIENT_PROFILE_API_PATHS.ownProfile,
      },
      {
        action: frameworkModeAction(writeOwnAvatar),
        path: CLIENT_PROFILE_API_PATHS.avatars,
      },
    ],
    { initialEntries: [CLIENT_PROFILE_PATH] },
  );

  render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Your Profile" });

  return user;
}
