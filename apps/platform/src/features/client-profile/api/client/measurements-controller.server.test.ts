import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  MeasurementHistory,
  type MeasurementRecord,
  type ReadOwnMeasurementHistoryUseCase,
  type RecordMeasurementsUseCase,
} from "@eli-coach-platform/domain/client-profile";
import { UnitPreference } from "@eli-coach-platform/domain/unit-preference";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientMeasurementsController } from "./measurements-controller.server";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH_SESSION: ResolvedSession = {
  account: { ...CLIENT, role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const FIRST_ENTRY_ID = "0f5c7e1a-2b3d-4c5e-8f9a-1b2c3d4e5f60";
const SECOND_ENTRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const NEW_ENTRY_ID = "4d5e6f7a-8b9c-4d0e-8f1a-2b3c4d5e6f70";
const CONSENTED_AT = new Date("2026-09-01T09:30:00.000Z");
const MEASUREMENTS_URL = "https://evoa.fit/api/client-profile/measurements";
const MAX_RECORD_BYTES = 32 * 1024 * 1024;

const RECORDS: MeasurementRecord[] = [
  {
    id: FIRST_ENTRY_ID,
    recordedAt: new Date("2026-08-25T09:00:00.000Z"),
    weightKg: 66.1,
    waistCm: 74,
    hipsCm: 98,
    photos: [],
  },
  {
    id: SECOND_ENTRY_ID,
    recordedAt: new Date("2026-09-01T09:00:00.000Z"),
    weightKg: 65.4,
    waistCm: 73,
    photos: [],
  },
];

type RecordMeasurementsResult = Awaited<
  ReturnType<RecordMeasurementsUseCase["execute"]>
>;

type OwnMeasurementHistoryReading = Awaited<
  ReturnType<ReadOwnMeasurementHistoryUseCase["execute"]>
>;

const READING: NonNullable<OwnMeasurementHistoryReading> = {
  history: MeasurementHistory.of(RECORDS),
  consentedAt: CONSENTED_AT,
  dueLine: "weigh-in",
  units: UnitPreference.metric(),
};

describe("ClientMeasurementsController loadPage", () => {
  it("hands her history newest first, when she agreed to photos, her units and what is due now", async () => {
    // arrange
    const { controller, readOwnMeasurementHistory } = createController({
      reading: { ...READING, units: UnitPreference.of("imperial") },
    });

    // act
    const page = await controller.loadPage(pageArgs());

    // assert
    expect(page).toEqual({
      history: [
        {
          id: SECOND_ENTRY_ID,
          recordedAt: "2026-09-01T09:00:00.000Z",
          weightKg: 65.4,
          waistCm: 73,
          hipsCm: null,
          thighCm: null,
          armCm: null,
          photos: [],
        },
        {
          id: FIRST_ENTRY_ID,
          recordedAt: "2026-08-25T09:00:00.000Z",
          weightKg: 66.1,
          waistCm: 74,
          hipsCm: 98,
          thighCm: null,
          armCm: null,
          photos: [],
        },
      ],
      consentedAt: "2026-09-01T09:30:00.000Z",
      units: { weightUnit: "lb", heightUnit: "ft-in" },
      dueLine: "weigh-in",
    });
    expect(readOwnMeasurementHistory).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
    });
  });

  it("hands no due line when nothing is due for her", async () => {
    // arrange
    const { controller } = createController({
      reading: { ...READING, dueLine: null },
    });

    // act
    const page = await controller.loadPage(pageArgs());

    // assert
    expect(page.dueLine).toBeNull();
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() => controller.loadPage(pageArgs()));

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("sends a visitor who is not signed in to sign in without reading anything", async () => {
    // arrange
    const { controller, readOwnMeasurementHistory } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadPage(pageArgs({ session: ANONYMOUS_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readOwnMeasurementHistory).not.toHaveBeenCalled();
  });
});

describe("ClientMeasurementsController loadNudge", () => {
  it("names the line that is due for her now", async () => {
    // arrange
    const { controller } = createController();

    // act
    const nudge = await controller.loadNudge(pageArgs());

    // assert
    expect(nudge).toEqual({ dueLine: "weigh-in" });
  });

  it("names no line for a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const nudge = await controller.loadNudge(pageArgs());

    // assert
    expect(nudge).toEqual({ dueLine: null });
  });
});

describe("ClientMeasurementsController record", () => {
  it("hands her canonical values, her consent and every photo part untouched to the recording, and answers the outcome per view", async () => {
    // arrange
    const { controller, recordMeasurements } = createController({
      recorded: {
        status: "recorded",
        entryId: NEW_ENTRY_ID,
        photos: { front: "stored", back: "refused" },
      },
    });
    const form = entryForm({ weightKg: 64.2, waistCm: 71.5, armCm: 28 });
    form.set("photoConsent", "given");
    form.set(
      "front",
      new File([new Uint8Array([255, 216, 255])], "front.jpg", {
        type: "image/jpeg",
      }),
    );
    form.set(
      "back",
      new File(["not an image"], "back.jpg", { type: "text/plain" }),
    );

    // act
    const response = await controller.record(recordArgs({ body: form }));

    // assert
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      entryId: NEW_ENTRY_ID,
      photos: { front: "stored", side: "absent", back: "refused" },
    });
    expect(recordMeasurements).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      values: { weightKg: 64.2, waistCm: 71.5, armCm: 28 },
      consentGiven: true,
      photos: [
        {
          view: "front",
          mimeType: "image/jpeg",
          sizeBytes: 3,
          bytes: new Uint8Array([255, 216, 255]),
        },
        {
          view: "back",
          mimeType: "text/plain",
          sizeBytes: 12,
          bytes: new TextEncoder().encode("not an image"),
        },
      ],
    });
  });

  it("records her entry without consent or photos when the form carries neither", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const response = await controller.record(
      recordArgs({ body: entryForm({ weightKg: 64.2, waistCm: 71.5 }) }),
    );

    // assert
    expect(response.status).toBe(201);
    expect(recordMeasurements).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      values: { weightKg: 64.2, waistCm: 71.5 },
      consentGiven: false,
      photos: [],
    });
  });

  it("refuses a form whose entry is not canonical numbers without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const response = await controller.record(
      recordArgs({ body: entryForm({ weightKg: "64.2", waistCm: 71.5 }) }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });

  it("refuses a form with no entry field without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const response = await controller.record(
      recordArgs({ body: new FormData() }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });

  it("refuses a body that is not a form without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const response = await controller.record(
      recordArgs({ body: JSON.stringify({ weightKg: 64.2, waistCm: 71.5 }) }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });

  it("refuses a body beyond 32 MiB without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const response = await controller.record(
      recordArgs({
        body: entryForm({ weightKg: 64.2, waistCm: 71.5 }),
        headers: { "Content-Length": String(MAX_RECORD_BYTES + 1) },
      }),
    );

    // assert
    expect(response.status).toBe(413);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });

  it("answers bad request when the recording finds her values out of range", async () => {
    // arrange
    const { controller } = createController({
      recorded: { status: "invalid" },
    });

    // act
    const response = await controller.record(
      recordArgs({ body: entryForm({ weightKg: 900, waistCm: 71.5 }) }),
    );

    // assert
    expect(response.status).toBe(400);
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({
      recorded: { status: "not-on-journey" },
    });

    // act
    const response = await controller.record(
      recordArgs({ body: entryForm({ weightKg: 64.2, waistCm: 71.5 }) }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-on-journey" });
  });

  it("refuses a visitor who is not signed in without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.record(
        recordArgs({
          body: entryForm({ weightKg: 64.2, waistCm: 71.5 }),
          session: ANONYMOUS_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });

  it("refuses the coach without recording anything", async () => {
    // arrange
    const { controller, recordMeasurements } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.record(
        recordArgs({
          body: entryForm({ weightKg: 64.2, waistCm: 71.5 }),
          session: COACH_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(recordMeasurements).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    reading?: OwnMeasurementHistoryReading;
    recorded?: RecordMeasurementsResult;
  } = {},
) {
  const readOwnMeasurementHistory = vi
    .fn()
    .mockResolvedValue(
      options.reading === undefined ? READING : options.reading,
    );
  const recordMeasurements = vi.fn().mockResolvedValue(
    options.recorded ?? {
      status: "recorded",
      entryId: NEW_ENTRY_ID,
      photos: {},
    },
  );
  const controller = new ClientMeasurementsController({
    readOwnMeasurementHistory: {
      execute: readOwnMeasurementHistory,
    } as unknown as ReadOwnMeasurementHistoryUseCase,
    recordMeasurements: {
      execute: recordMeasurements,
    } as unknown as RecordMeasurementsUseCase,
  });

  return { controller, readOwnMeasurementHistory, recordMeasurements };
}

function entryForm(entry: Record<string, unknown>): FormData {
  const form = new FormData();
  form.set("entry", JSON.stringify(entry));

  return form;
}

function pageArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request: new Request("https://evoa.fit/client/profile"),
  });
}

function recordArgs(options: {
  body: FormData | string;
  headers?: Record<string, string>;
  session?: ResolvedSession;
}) {
  const request = new Request(MEASUREMENTS_URL, {
    body: options.body,
    method: "POST",
  });
  const headers = new Headers(request.headers);

  for (const [name, value] of Object.entries(options.headers ?? {})) {
    headers.set(name, value);
  }

  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request: new Request(request, { headers }),
  });
}

function sessionContexts(session?: ResolvedSession) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return [
    contextEntry(accountsContext, accounts),
    contextEntry(
      sessionContext,
      session ?? { account: CLIENT, kind: "authenticated" },
    ),
  ];
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
