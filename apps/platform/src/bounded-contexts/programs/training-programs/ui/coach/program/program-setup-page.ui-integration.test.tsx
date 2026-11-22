// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
  UNSAFE_ErrorResponseImpl as ErrorResponseImpl,
  type ActionFunctionArgs,
  type ClientActionFunctionArgs,
} from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";
import {
  PROGRAM_SETUP_ROUTE_SEGMENT,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import {
  programSetupChoices,
  type ProgramCreateOutcome,
  type ProgramSetupView,
} from "~/bounded-contexts/programs/training-programs/public/program-setup";

import ProgramSetupRoute, { clientAction } from "./program-setup-page";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
} as const;

const GOAL_OPTIONS = [
  "Lose fat",
  "Build muscle",
  "Maintain a healthy weight",
  "Learn to balance activity and nutrition",
  "Improve overall health",
  "Work with my menstrual cycle",
];

const EQUIPMENT_OPTIONS = [
  { value: "Full gym", exclusive: false },
  { value: "Machines", exclusive: false },
  { value: "Barbell", exclusive: false },
  { value: "Dumbbells", exclusive: false },
  { value: "Kettlebells", exclusive: false },
  { value: "Resistance bands", exclusive: false },
  { value: "Bodyweight only", exclusive: true },
];

const STARTING_VALUES = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Full gym", "Dumbbells"],
} as const;

const READY: ProgramSetupView = {
  state: "ready",
  client: CLIENT,
  startingValues: {
    ...STARTING_VALUES,
    equipment: [...STARTING_VALUES.equipment],
  },
  choices: programSetupChoices({
    goalOptions: GOAL_OPTIONS,
    equipmentOptions: EQUIPMENT_OPTIONS,
    splitShapeByTrainingDays: {
      2: "full-body",
      3: "full-body",
      4: "upper-lower",
      5: "upper-lower",
    },
  }),
};

const NOT_READY: ProgramSetupView = { state: "not-ready", client: CLIENT };

const FAILED: ProgramCreateOutcome = { status: "failed" };

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("the program setup", () => {
  it("titles the page once under a link back to the client", async () => {
    // arrange, act
    await renderSetup(READY);

    // assert
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Build Ana’s program" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(
      within(
        screen.getByRole("navigation", { name: "Back to the client" }),
      ).getByRole("link", { name: "Back to Ana Popescu" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    expect(
      screen.getByRole("main", { name: "Build Ana’s program" }),
    ).toBeInTheDocument();
  });

  it("lists every field in one form in the order they depend on each other", async () => {
    // arrange, act
    await renderSetup(READY);

    // assert
    const labels = [
      "Goal",
      "Level",
      "Training days",
      "Split",
      "Session length",
      "Daily steps",
      "Equipment",
      "Program language",
    ];
    const positions = labels.map(
      (label) => screen.getAllByText(label, { exact: true })[0],
    );
    for (const [index, label] of positions.entries()) {
      if (index > 0) {
        expect(
          positions[index - 1].compareDocumentPosition(label) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    }
  });

  it("names the goals the way a coach reads them", async () => {
    // arrange
    const user = await renderSetup(READY);
    const goal = screen.getByRole("combobox", { name: /^Goal/ });
    expect(goal).toHaveTextContent("Fat loss");

    // act
    await user.click(goal);

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Fat loss",
      "Muscle gain",
      "Weight maintenance",
      "Activity and nutrition balance",
      "Overall health",
      "Cycle-aware training",
    ]);
  });

  it("offers the daily steps in thousands from 4,000 to 12,000", async () => {
    // arrange
    const user = await renderSetup(READY);
    const steps = screen.getByRole("combobox", { name: "Daily steps" });
    expect(steps).toHaveTextContent("6,000");

    // act
    await user.click(steps);

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "4,000",
      "5,000",
      "6,000",
      "7,000",
      "8,000",
      "9,000",
      "10,000",
      "11,000",
      "12,000",
    ]);
  });

  it("prefills her coaching facts and creates the program from them, back on her page", async () => {
    // arrange
    const sent = answerCreated();
    const user = await renderSetup(READY);
    expect(screen.getByRole("combobox", { name: "Level" })).toHaveTextContent(
      "Beginner",
    );
    expect(
      screen.getByRole("combobox", { name: "Program language" }),
    ).toHaveTextContent("English");
    expect(screen.getByRole("radio", { name: "3 days" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Full Body" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "60 min" })).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Full gym" }),
    ).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Dumbbells" }),
    ).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    ).not.toBeChecked();

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([STARTING_VALUES]);
  });

  it("creates the program with the choices she changed", async () => {
    // arrange
    const sent = answerCreated();
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("combobox", { name: "Level" }));
    await user.click(screen.getByRole("option", { name: "Advanced" }));
    await user.click(screen.getByRole("radio", { name: "45 min" }));
    await user.click(screen.getByRole("combobox", { name: "Daily steps" }));
    await user.click(screen.getByRole("option", { name: "8,000" }));
    await user.click(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    );
    await user.click(
      screen.getByRole("combobox", { name: "Program language" }),
    );
    await user.click(screen.getByRole("option", { name: "Romanian" }));

    await user.click(screen.getByRole("button", { name: "Create program" }));

    // act
    await user.click(
      within(confirmation()).getByRole("button", { name: "Create program" }),
    );

    // assert
    await screen.findByRole("heading", { level: 1, name: "Client page" });
    expect(sent).toEqual([
      {
        ...STARTING_VALUES,
        level: "advanced",
        sessionMinutes: 45,
        dailySteps: 8000,
        equipment: ["Full gym", "Dumbbells", "Kettlebells"],
        language: "ro",
      },
    ]);
  });

  it("submits the form with Enter", async () => {
    // arrange
    answerCreated();
    const user = await renderSetup(READY);
    screen.getByRole("button", { name: "Create program" }).focus();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
  });

  it("offers the two splits as a plain radio without descriptions", async () => {
    // arrange, act
    await renderSetup(READY);

    // assert
    const split = screen.getByRole("radiogroup", { name: "Split" });
    expect(
      within(split)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["Full Body", "Upper / Lower"]);
  });

  it("follows the training days with the suggested split", async () => {
    // arrange
    const user = await renderSetup(READY);

    // act
    await user.click(screen.getByRole("radio", { name: "4 days" }));

    // assert
    expect(screen.getByRole("radio", { name: "Upper / Lower" })).toBeChecked();
  });

  it("keeps the split the coach chose when the training days change", async () => {
    // arrange
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("radio", { name: "Upper / Lower" }));

    // act
    await user.click(screen.getByRole("radio", { name: "2 days" }));

    // assert
    expect(screen.getByRole("radio", { name: "Upper / Lower" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2 days" })).toBeChecked();
  });

  it("keeps the split she chose even after choosing the suggested one back", async () => {
    // arrange
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("radio", { name: "Upper / Lower" }));
    await user.click(screen.getByRole("radio", { name: "Full Body" }));

    // act
    await user.click(screen.getByRole("radio", { name: "5+ days" }));

    // assert
    expect(screen.getByRole("radio", { name: "Full Body" })).toBeChecked();
  });

  it("lists the equipment her profile offers", async () => {
    // arrange, act
    await renderSetup(READY);

    // assert
    expect(
      within(equipment())
        .getAllByRole("checkbox")
        .map((chip) => chip.getAttribute("aria-label")),
    ).toEqual(EQUIPMENT_OPTIONS.map((option) => option.value));
  });

  it("keeps bodyweight only exclusive of every other chip", async () => {
    // arrange
    const user = await renderSetup(READY);

    // act
    await user.click(
      within(equipment()).getByRole("checkbox", { name: "Bodyweight only" }),
    );

    // assert
    expect(
      within(equipment()).getByRole("checkbox", { name: "Bodyweight only" }),
    ).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Full gym" }),
    ).not.toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Dumbbells" }),
    ).not.toBeChecked();

    // act
    await user.click(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    );

    // assert
    expect(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    ).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Bodyweight only" }),
    ).not.toBeChecked();
  });

  it("explains nothing under the fields", async () => {
    // arrange, act
    await renderSetup(READY);

    // assert
    expect(screen.queryByText(/Suggested from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pick everything/)).not.toBeInTheDocument();
  });

  it("shows the goal and equipment problems at their fields and keeps her other choices", async () => {
    // arrange
    answerOutcome({
      status: "invalid",
      problems: { goal: "missing", equipment: "missing" },
    });
    const user = await renderSetup({
      ...READY,
      startingValues: { ...READY.startingValues, goal: "" },
    } as ProgramSetupView);
    await user.click(screen.getByRole("radio", { name: "4 days" }));
    await clearEquipment(user);

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    const goalProblem = await screen.findByText("Choose a goal.");
    expect(goalProblem).toHaveAttribute("role", "alert");
    expect(screen.getByRole("combobox", { name: /^Goal/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("combobox", { name: /^Goal/ }),
    ).toHaveAccessibleDescription("Choose a goal.");
    expect(equipment()).toHaveAccessibleDescription(
      "Choose at least one equipment option.",
    );
    expect(
      screen.getByText("Choose at least one equipment option."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("radio", { name: "4 days" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Upper / Lower" })).toBeChecked();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Client page" }),
    ).not.toBeInTheDocument();
  });

  it("clears the equipment problem once she chooses equipment", async () => {
    // arrange
    answerOutcome({ status: "invalid", problems: { equipment: "missing" } });
    const user = await renderSetup(READY);
    await clearEquipment(user);
    await user.click(screen.getByRole("button", { name: "Create program" }));
    await screen.findByText("Choose at least one equipment option.");

    // act
    await user.click(
      within(equipment()).getByRole("checkbox", { name: "Machines" }),
    );

    // assert
    expect(
      screen.queryByText("Choose at least one equipment option."),
    ).not.toBeInTheDocument();
  });

  it("keeps every choice and says so when the program could not be created", async () => {
    // arrange
    answerOutcome(FAILED);
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("radio", { name: "4 days" }));
    await user.click(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    );

    await user.click(screen.getByRole("button", { name: "Create program" }));

    // act
    await user.click(
      within(confirmation()).getByRole("button", { name: "Create program" }),
    );

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The program wasn’t created. Your choices are still here, so try again.",
    );
    expect(screen.getByRole("radio", { name: "4 days" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Upper / Lower" })).toBeChecked();
    expect(
      within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Create program" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Client page" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["the client is not found", 404, "Not Found"],
    ["the setup cannot be read", 400, "The program setup could not be read."],
  ])(
    "leaves the page to the error page, not the failed-save notice, when %s",
    async (_refusal, status, body) => {
      // arrange
      server.use(
        http.post(SETUP_REQUESTS, () => new HttpResponse(body, { status })),
      );
      const user = await renderSetup(READY);

      // act
      await user.click(screen.getByRole("button", { name: "Create program" }));

      // assert
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: `Error page: ${status}`,
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          "The program wasn’t created. Your choices are still here, so try again.",
        ),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ["never reaches the server", () => HttpResponse.error()],
    [
      "fails on the server",
      () => new HttpResponse("Internal Server Error", { status: 500 }),
    ],
  ])(
    "keeps every choice, says so and creates on the next try when the request %s",
    async (_failure, failedAnswer) => {
      // arrange
      server.use(http.post(SETUP_REQUESTS, failedAnswer, { once: true }));
      const user = await renderSetup(READY);
      await user.click(screen.getByRole("radio", { name: "4 days" }));
      await user.click(screen.getByRole("button", { name: "Create program" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "The program wasn’t created. Your choices are still here, so try again.",
      );
      expect(screen.getByRole("radio", { name: "4 days" })).toBeChecked();
      expect(
        screen.getByRole("radio", { name: "Upper / Lower" }),
      ).toBeChecked();
      const sent = answerCreated();

      // act
      await user.click(screen.getByRole("button", { name: "Create program" }));

      // assert
      expect(
        await screen.findByRole("heading", { level: 1, name: "Client page" }),
      ).toBeInTheDocument();
      expect(sent).toEqual([
        { ...STARTING_VALUES, trainingDays: 4, splitShape: "upper-lower" },
      ]);
    },
  );

  it("announces the saving state through a status that is empty at rest and again once the create has failed", async () => {
    // arrange
    const held = holdCreate(FAILED);
    const user = await renderSetup(READY);
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    await waitFor(() =>
      expect(status).toHaveTextContent("Creating the program…"),
    );
    held.release();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The program wasn’t created. Your choices are still here, so try again.",
    );
    expect(status).toBeEmptyDOMElement();
  });

  it("reads Creating… and takes no second submit while the program is being created", async () => {
    // arrange
    const held = holdCreate();
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("button", { name: "Create program" }));
    const creating = await screen.findByRole("button", { name: "Creating…" });

    // act
    await user.click(creating);

    // assert
    expect(creating).toBeDisabled();
    expect(creating).toHaveAttribute("aria-busy", "true");
    held.release();
    await screen.findByRole("heading", { level: 1, name: "Client page" });
    expect(held.requests()).toBe(1);
  });

  it("returns to her page on cancel when nothing changed", async () => {
    // arrange
    const user = await renderSetup(READY);

    // act
    await user.click(screen.getByRole("link", { name: "Cancel" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Unsaved changes" }),
    ).not.toBeInTheDocument();
  });

  it("asks before leaving with unsaved changes", async () => {
    // arrange
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("radio", { name: "4 days" }));

    // act
    await user.click(screen.getByRole("link", { name: "Cancel" }));

    // assert
    const dialog = screen.getByRole("dialog", { name: "Unsaved changes" });
    expect(dialog).toHaveAccessibleDescription(
      "Leave without creating the program? The choices you made here are lost.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Unsaved changes" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("radio", { name: "4 days" })).toBeChecked();
    await user.click(screen.getByRole("link", { name: "Cancel" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Unsaved changes" })).getByRole(
        "button",
        { name: "Discard" },
      ),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
  });

  it("asks before leaving through the link back to her with unsaved changes", async () => {
    // arrange
    const user = await renderSetup(READY);
    await user.click(screen.getByRole("radio", { name: "4 days" }));

    // act
    await user.click(screen.getByRole("link", { name: "Back to Ana Popescu" }));

    // assert
    expect(
      screen.getByRole("dialog", { name: "Unsaved changes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Client page" }),
    ).not.toBeInTheDocument();
  });

  it("shows no form until her answers are approved", async () => {
    // arrange, act
    await renderSetup(NOT_READY);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Program not ready yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The program opens once her answers are approved."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(
      within(
        screen.getByRole("navigation", { name: "Back to the client" }),
      ).getByRole("link", { name: "Back to Ana Popescu" }),
    ).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create program" }),
    ).not.toBeInTheDocument();
  });

  it("words the not-ready reason for his answers", async () => {
    // arrange, act
    await renderSetup({
      state: "not-ready",
      client: { ...CLIENT, gender: "male" },
    });

    // assert
    expect(
      screen.getByText("The program opens once his answers are approved."),
    ).toBeInTheDocument();
  });
});

describe("the program setup when the equipment differs from her profile", () => {
  it("opens a confirmation that names what changes on her profile", async () => {
    // arrange
    const sent = answerCreated();
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Kettlebells");
    await chooseEquipment(user, "Full gym");

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    const dialog = confirmation();
    expect(dialog).toHaveAccessibleDescription(
      "Creating the program saves the equipment you chose here to her profile. Adding: Kettlebells. Removing: Full gym.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    ).toHaveFocus();
    expect(
      within(dialog).getByRole("button", { name: "Create program" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("says she is switching to bodyweight only", async () => {
    // arrange
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Bodyweight only");

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    expect(confirmation()).toHaveAccessibleDescription(
      "Creating the program saves the equipment you chose here to her profile. Switching to: Bodyweight only. Removing: Full gym, Dumbbells.",
    );
  });

  it("words the confirmation for his profile", async () => {
    // arrange
    const user = await renderSetup({
      ...READY,
      client: { ...CLIENT, gender: "male" },
    });
    await chooseEquipment(user, "Kettlebells");

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    expect(
      screen.getByRole("dialog", { name: "This updates Ana’s profile" }),
    ).toHaveAccessibleDescription(
      "Creating the program saves the equipment you chose here to his profile. Adding: Kettlebells.",
    );
  });

  it("creates the program with the equipment once confirmed", async () => {
    // arrange
    const sent = answerCreated();
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Kettlebells");
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // act
    await user.click(
      within(confirmation()).getByRole("button", { name: "Create program" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        ...STARTING_VALUES,
        equipment: ["Full gym", "Dumbbells", "Kettlebells"],
      },
    ]);
  });

  it.each([
    [
      "Keep editing",
      async (user: User) =>
        user.click(
          within(confirmation()).getByRole("button", { name: "Keep editing" }),
        ),
    ],
    ["Escape", async (user: User) => user.keyboard("{Escape}")],
    [
      "the X",
      async (user: User) =>
        user.click(
          within(confirmation()).getByRole("button", { name: "Close" }),
        ),
    ],
  ])(
    "returns to the form with every choice kept and creates nothing on %s",
    async (_way, goBack) => {
      // arrange
      const sent = answerCreated();
      const user = await renderSetup(READY);
      await user.click(screen.getByRole("radio", { name: "4 days" }));
      await chooseEquipment(user, "Kettlebells");
      const create = screen.getByRole("button", { name: "Create program" });
      await user.click(create);
      expect(confirmation()).toBeInTheDocument();

      // act
      await goBack(user);

      // assert
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("radio", { name: "4 days" })).toBeChecked();
      expect(
        screen.getByRole("radio", { name: "Upper / Lower" }),
      ).toBeChecked();
      expect(
        within(equipment()).getByRole("checkbox", { name: "Kettlebells" }),
      ).toBeChecked();
      expect(
        within(equipment()).getByRole("checkbox", { name: "Full gym" }),
      ).toBeChecked();
      expect(create).toHaveFocus();
      expect(sent).toEqual([]);
    },
  );

  it("returns focus to Create program when the form was submitted from a field", async () => {
    // arrange
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Kettlebells");
    const field = screen.getByRole("radio", { name: "4 days" });
    field.focus();
    fireEvent.submit(field.closest("form")!);
    const dialog = await screen.findByRole("dialog", {
      name: "This updates Ana’s profile",
    });

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    );

    // assert
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create program" }),
      ).toHaveFocus(),
    );
  });

  it("shows the alert once the save fails and opens the confirmation again on the next press", async () => {
    // arrange
    answerOutcome(FAILED);
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Kettlebells");
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // act
    await user.click(
      within(confirmation()).getByRole("button", { name: "Create program" }),
    );

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The program wasn’t created. Your choices are still here, so try again.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create program" }));
    expect(confirmation()).toBeInTheDocument();
  });

  it("creates the program at once when the equipment is unchanged", async () => {
    // arrange
    const sent = answerCreated();
    const user = await renderSetup(READY);
    await chooseEquipment(user, "Kettlebells");
    await chooseEquipment(user, "Kettlebells");

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Client page" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([STARTING_VALUES]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the field problems before any confirmation", async () => {
    // arrange
    answerOutcome({ status: "invalid", problems: { equipment: "missing" } });
    const user = await renderSetup(READY);
    await clearEquipment(user);

    // act
    await user.click(screen.getByRole("button", { name: "Create program" }));

    // assert
    expect(
      await screen.findByText("Choose at least one equipment option."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(equipment()).getAllByRole("checkbox")[0]).toHaveFocus();
  });
});

type User = ReturnType<typeof userEvent.setup>;

function confirmation(): HTMLElement {
  return screen.getByRole("dialog", { name: "This updates Ana’s profile" });
}

async function chooseEquipment(user: User, name: string) {
  await user.click(within(equipment()).getByRole("checkbox", { name }));
}

function equipment(): HTMLElement {
  return screen.getByRole("group", { name: /^Equipment/ });
}

async function clearEquipment(user: User) {
  for (const chip of within(equipment()).getAllByRole("checkbox")) {
    if ((chip as HTMLInputElement).checked) await user.click(chip);
  }
}

const SETUP_REQUESTS = `*/coach/${PROGRAM_SETUP_ROUTE_SEGMENT}`;

function answerCreated(): unknown[] {
  const sent: unknown[] = [];
  server.use(
    http.post(SETUP_REQUESTS, async ({ request }) => {
      sent.push(await request.json());

      return new HttpResponse(null, {
        headers: { Location: coachClientPath(CLIENT_ID) },
        status: 302,
      });
    }),
  );

  return sent;
}

function answerOutcome(outcome: ProgramCreateOutcome) {
  server.use(http.post(SETUP_REQUESTS, () => HttpResponse.json(outcome)));
}

function holdCreate(outcome?: ProgramCreateOutcome) {
  let release = () => {};
  let requests = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.post(SETUP_REQUESTS, async () => {
      requests += 1;
      await held;

      if (outcome) return HttpResponse.json(outcome);

      return new HttpResponse(null, {
        headers: { Location: coachClientPath(CLIENT_ID) },
        status: 302,
      });
    }),
  );

  return { release: () => release(), requests: () => requests };
}

// Stands in for React Router's serverAction: it answers the server's data,
// throws a redirect as a response and a refusal as a route error response,
// and rejects when the request gets no answer.
async function serverAnswer(request: Request): Promise<unknown> {
  const response = await fetch(request, { redirect: "manual" });

  if (response.headers.has("Location")) throw response;
  if (!response.ok) {
    throw new ErrorResponseImpl(
      response.status,
      response.statusText,
      await response.text(),
    );
  }

  return response.json();
}

function setupAction(args: ActionFunctionArgs) {
  return clientAction({
    ...args,
    serverAction: () => serverAnswer(args.request),
  } as ClientActionFunctionArgs);
}

function ErrorPage() {
  const error = useRouteError();

  return (
    <h1>{`Error page: ${isRouteErrorResponse(error) ? error.status : "unknown"}`}</h1>
  );
}

async function renderSetup(view: ProgramSetupView) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        action: setupAction,
        Component: ProgramSetupRoute,
        ErrorBoundary: ErrorPage,
        loader: () => view,
        path: `/coach/${PROGRAM_SETUP_ROUTE_SEGMENT}`,
      },
      {
        Component: () => <h1>Client page</h1>,
        path: "/coach/clients/:clientId",
      },
    ],
    { initialEntries: [programSetupPath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });

  return user;
}
