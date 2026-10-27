import type {
  ChangeCheckInSeriesResult,
  ChangeCheckInSeriesUseCase,
  CheckInSeriesSnapshot,
  CoachClientSeries,
  PreviewCheckInSeriesResult,
  PreviewCheckInSeriesUseCase,
  ReadCoachClientSeriesUseCase,
  SetUpCheckInSeriesResult,
  SetUpCheckInSeriesUseCase,
  StopCheckInSeriesResult,
  StopCheckInSeriesUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedSession } from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { CoachCheckInSeriesController } from "./coach-check-in-series-controller.server";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const SERIES_ID = "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a";
const NOW = new Date("2026-10-13T08:00:00.000Z");

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const SERIES: CheckInSeriesSnapshot = {
  id: SERIES_ID,
  clientId: CLIENT_ID,
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-14T08:00:00.000Z"),
  coversUntil: new Date("2027-01-13T08:00:00.000Z"),
  setUpAt: NOW,
  changedAt: null,
  stoppedAt: null,
};

describe("CoachCheckInSeriesController loadClientSeries", () => {
  it("hands the coach her client's series", async () => {
    // arrange
    const { controller } = createController({
      read: { series: SERIES, coachingEnds: false },
    });

    // act
    const panel = await controller.loadClientSeries(coachArgs(), CLIENT_ID);

    // assert
    expect(panel).toEqual({
      series: {
        id: SERIES_ID,
        weekday: "wednesday",
        hour: 18,
        timeZone: "Europe/Bucharest",
      },
      coachingEnds: false,
    });
  });

  it("hands no series when the client has none", async () => {
    // arrange
    const { controller } = createController();

    // act
    const panel = await controller.loadClientSeries(coachArgs(), CLIENT_ID);

    // assert
    expect(panel).toEqual({
      series: null,
      coachingEnds: false,
    });
  });

  it("hands that her coaching ends so the panel offers no weekly check-in", async () => {
    // arrange
    const { controller } = createController({
      read: { series: null, coachingEnds: true },
    });

    // act
    const panel = await controller.loadClientSeries(coachArgs(), CLIENT_ID);

    // assert
    expect(panel).toEqual({ series: null, coachingEnds: true });
  });

  it("answers 404 for a client id that is not one", async () => {
    // arrange
    const { controller, readCoachClientSeries } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadClientSeries(coachArgs(), "not-a-client"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readCoachClientSeries).not.toHaveBeenCalled();
  });

  it("refuses a client without reading anything", async () => {
    // arrange
    const { controller, readCoachClientSeries } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadClientSeries(
        coachArgs({ session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readCoachClientSeries).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInSeriesController preview", () => {
  it("answers the weekdays and each hour's weeks and clashes for the weekday asked", async () => {
    // arrange
    const { controller, previewCheckInSeries } = createController({
      previewed: {
        status: "previewed",
        weekdays: ["monday", "wednesday"],
        hours: [{ hour: 18, occurrences: 13, clashes: 1 }],
      },
    });

    // act
    const response = await controller.preview(
      coachArgs({ query: { clientId: CLIENT_ID, weekday: "wednesday" } }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      weekdays: ["monday", "wednesday"],
      hours: [{ hour: 18, weeks: 13, clashes: 1 }],
    });
    expect(previewCheckInSeries).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      weekday: "wednesday",
    });
  });

  it.each([
    { status: "unknown_client", code: 404 },
    { status: "client_cannot_answer", code: 409 },
  ] as const)("answers $status with $code", async ({ status, code }) => {
    // arrange
    const { controller } = createController({ previewed: { status } });

    // act
    const response = await controller.preview(
      coachArgs({ query: { clientId: CLIENT_ID, weekday: "wednesday" } }),
    );

    // assert
    expect(response.status).toBe(code);
  });

  it("refuses a query without a weekday as invalid", async () => {
    // arrange
    const { controller, previewCheckInSeries } = createController();

    // act
    const response = await controller.preview(
      coachArgs({ query: { clientId: CLIENT_ID, weekday: "someday" } }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(previewCheckInSeries).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInSeriesController setUp", () => {
  it("sets the series up and answers 201 with its id", async () => {
    // arrange
    const { controller, setUpCheckInSeries } = createController({
      setUp: { status: "set_up", series: SERIES, occurrences: [] },
    });

    // act
    const response = await controller.setUp(
      coachArgs({
        body: { clientId: CLIENT_ID, weekday: "wednesday", hour: 18 },
      }),
    );

    // assert
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      status: "set_up",
      seriesId: SERIES_ID,
    });
    expect(setUpCheckInSeries).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      weekday: "wednesday",
      hour: 18,
    });
  });

  it.each([
    "series_exists",
    "client_cannot_answer",
    "outside_availability",
    "nothing_to_create",
  ] as const)("refuses %s with 409", async (status) => {
    // arrange
    const { controller } = createController({ setUp: { status } });

    // act
    const response = await controller.setUp(
      coachArgs({
        body: { clientId: CLIENT_ID, weekday: "wednesday", hour: 18 },
      }),
    );

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: status });
  });

  it("answers 404 for an unknown client", async () => {
    // arrange
    const { controller } = createController({
      setUp: { status: "unknown_client" },
    });

    // act
    const response = await controller.setUp(
      coachArgs({
        body: { clientId: CLIENT_ID, weekday: "wednesday", hour: 18 },
      }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses an hour outside the day as invalid without setting anything up", async () => {
    // arrange
    const { controller, setUpCheckInSeries } = createController();

    // act
    const response = await controller.setUp(
      coachArgs({
        body: { clientId: CLIENT_ID, weekday: "wednesday", hour: 24 },
      }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(setUpCheckInSeries).not.toHaveBeenCalled();
  });

  it("refuses a client without setting anything up", async () => {
    // arrange
    const { controller, setUpCheckInSeries } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.setUp(
        coachArgs({
          session: CLIENT_SESSION,
          body: { clientId: CLIENT_ID, weekday: "wednesday", hour: 18 },
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(setUpCheckInSeries).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInSeriesController change", () => {
  it("changes the series named in the path and answers 200", async () => {
    // arrange
    const { controller, changeCheckInSeries } = createController({
      changed: {
        status: "changed",
        series: { ...SERIES, weekday: "friday", hour: 9 },
        occurrences: [],
      },
    });

    // act
    const response = await controller.change(
      coachArgs({ body: { weekday: "friday", hour: 9 } }),
      SERIES_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "changed",
      seriesId: SERIES_ID,
    });
    expect(changeCheckInSeries).toHaveBeenCalledWith({
      seriesId: SERIES_ID,
      weekday: "friday",
      hour: 9,
    });
  });

  it.each([
    { status: "unknown_series", code: 404 },
    { status: "outside_availability", code: 409 },
    { status: "client_cannot_answer", code: 409 },
    { status: "changed_meanwhile", code: 409 },
  ] as const)("answers $status with $code", async ({ status, code }) => {
    // arrange
    const { controller } = createController({ changed: { status } });

    // act
    const response = await controller.change(
      coachArgs({ body: { weekday: "friday", hour: 9 } }),
      SERIES_ID,
    );

    // assert
    expect(response.status).toBe(code);
  });

  it("answers 404 for a series id that is not one", async () => {
    // arrange
    const { controller, changeCheckInSeries } = createController();

    // act
    const response = await controller.change(
      coachArgs({ body: { weekday: "friday", hour: 9 } }),
      "not-a-series",
    );

    // assert
    expect(response.status).toBe(404);
    expect(changeCheckInSeries).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInSeriesController stop", () => {
  it("stops the series named in the path and answers 200", async () => {
    // arrange
    const { controller, stopCheckInSeries } = createController({
      stopped: { status: "stopped", series: { ...SERIES, stoppedAt: NOW } },
    });

    // act
    const response = await controller.stop(coachArgs(), SERIES_ID);

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "stopped",
      seriesId: SERIES_ID,
    });
    expect(stopCheckInSeries).toHaveBeenCalledWith({ seriesId: SERIES_ID });
  });

  it.each([
    { status: "unknown_series", code: 404 },
    { status: "changed_meanwhile", code: 409 },
  ] as const)("answers $status with $code", async ({ status, code }) => {
    // arrange
    const { controller } = createController({ stopped: { status } });

    // act
    const response = await controller.stop(coachArgs(), SERIES_ID);

    // assert
    expect(response.status).toBe(code);
  });
});

function createController(
  answers: {
    read?: CoachClientSeries;
    previewed?: PreviewCheckInSeriesResult;
    setUp?: SetUpCheckInSeriesResult;
    changed?: ChangeCheckInSeriesResult;
    stopped?: StopCheckInSeriesResult;
  } = {},
) {
  const readCoachClientSeries = vi
    .fn()
    .mockResolvedValue(answers.read ?? { series: null, coachingEnds: false });
  const previewCheckInSeries = vi
    .fn()
    .mockResolvedValue(answers.previewed ?? { status: "unknown_client" });
  const setUpCheckInSeries = vi
    .fn()
    .mockResolvedValue(answers.setUp ?? { status: "unknown_client" });
  const changeCheckInSeries = vi
    .fn()
    .mockResolvedValue(answers.changed ?? { status: "unknown_series" });
  const stopCheckInSeries = vi
    .fn()
    .mockResolvedValue(answers.stopped ?? { status: "unknown_series" });
  const controller = new CoachCheckInSeriesController({
    unitOfWork: (work) => work(),
    changeCheckInSeries: {
      execute: changeCheckInSeries,
    } as unknown as ChangeCheckInSeriesUseCase,
    previewCheckInSeries: {
      execute: previewCheckInSeries,
    } as unknown as PreviewCheckInSeriesUseCase,
    readCoachClientSeries: {
      execute: readCoachClientSeries,
    } as unknown as ReadCoachClientSeriesUseCase,
    setUpCheckInSeries: {
      execute: setUpCheckInSeries,
    } as unknown as SetUpCheckInSeriesUseCase,
    stopCheckInSeries: {
      execute: stopCheckInSeries,
    } as unknown as StopCheckInSeriesUseCase,
  });

  return {
    changeCheckInSeries,
    controller,
    previewCheckInSeries,
    readCoachClientSeries,
    setUpCheckInSeries,
    stopCheckInSeries,
  };
}

function coachArgs(
  options: {
    session?: ResolvedSession;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
  } = {},
) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };
  const url = new URL("https://evoa.fit/api/check-ins/series");

  for (const [name, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(name, value);
  }

  return createRequestArgs({
    portal,
    session: options.session ?? COACH_SESSION,
    request: new Request(url, {
      body: options.body ? JSON.stringify(options.body) : null,
      headers: { "Content-Type": "application/json" },
      method: options.body ? "POST" : "GET",
    }),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
