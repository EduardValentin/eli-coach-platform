import { describe, expect, it } from "vitest";

import { CheckIn, type CheckInProps } from "./check-in";
import { CheckInNote } from "./check-in-note";
import { CheckInTimeZone } from "./check-in-time-zone";

const STARTS_AT = new Date("2026-06-03T09:00:00.000Z");
const ENDS_AT = new Date("2026-06-03T10:00:00.000Z");

const CLIENT_REQUEST = {
  id: "check-in-1",
  clientId: "client-1",
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: "Can we look at my squat?",
  requestedAt: new Date("2026-06-01T08:30:00.000Z"),
  answeredAt: null,
} satisfies CheckInProps;

function checkIn(props?: Partial<CheckInProps>): CheckIn {
  return CheckIn.reconstitute({ ...CLIENT_REQUEST, ...props });
}

function approvedCheckIn(): CheckIn {
  return checkIn({
    recordedStatus: "approved",
    answeredAt: new Date("2026-06-01T12:00:00.000Z"),
  });
}

function zoneOf(name: string): CheckInTimeZone {
  const result = CheckInTimeZone.from(name);

  if (result.status !== "valid") {
    throw new Error(`expected a named zone, got ${name}`);
  }

  return result.timeZone;
}

function noteOf(raw: string): CheckInNote | null {
  const written = CheckInNote.from(raw);

  if (written.status !== "accepted") {
    throw new Error(`expected an accepted note, got ${written.status}`);
  }

  return written.note;
}

describe("CheckIn.requestedByClient", () => {
  it("records a pending ad-hoc check-in the client initiated and proposed", () => {
    // arrange
    const request = {
      id: "check-in-2",
      clientId: "client-1",
      startsAt: STARTS_AT,
      clientTimeZone: zoneOf("Europe/London"),
      coachTimeZone: "Europe/Bucharest",
      note: noteOf("  Can we look at my squat?  "),
      requestedAt: new Date("2026-06-01T08:30:00.000Z"),
    };

    // act
    const requested = CheckIn.requestedByClient(request);

    // assert
    expect(requested.toSnapshot()).toEqual({
      id: "check-in-2",
      clientId: "client-1",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      joinEmphasisFrom: new Date("2026-06-03T08:50:00.000Z"),
      clientTimeZone: "Europe/London",
      coachTimeZone: "Europe/Bucharest",
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: "client",
      proposedBy: "client",
      note: "Can we look at my squat?",
      requestedAt: new Date("2026-06-01T08:30:00.000Z"),
      answeredAt: null,
    });
  });

  it("records no note when the client wrote none", () => {
    // arrange
    const request = {
      id: "check-in-2",
      clientId: "client-1",
      startsAt: STARTS_AT,
      clientTimeZone: zoneOf("Europe/London"),
      coachTimeZone: "Europe/Bucharest",
      note: null,
      requestedAt: new Date("2026-06-01T08:30:00.000Z"),
    };

    // act
    const requested = CheckIn.requestedByClient(request);

    // assert
    expect(requested.note).toBeNull();
  });
});

describe("CheckIn.scheduledByCoach", () => {
  it("records a pending ad-hoc check-in the coach initiated and proposed, in the client's zone", () => {
    // arrange
    const schedule = {
      id: "check-in-3",
      clientId: "client-1",
      startsAt: STARTS_AT,
      clientTimeZone: zoneOf("America/New_York"),
      coachTimeZone: "Europe/Bucharest",
      note: noteOf("Let's review your first month."),
      requestedAt: new Date("2026-06-01T08:30:00.000Z"),
    };

    // act
    const scheduled = CheckIn.scheduledByCoach(schedule);

    // assert
    expect(scheduled.toSnapshot()).toEqual({
      id: "check-in-3",
      clientId: "client-1",
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      joinEmphasisFrom: new Date("2026-06-03T08:50:00.000Z"),
      clientTimeZone: "America/New_York",
      coachTimeZone: "Europe/Bucharest",
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: "coach",
      proposedBy: "coach",
      note: "Let's review your first month.",
      requestedAt: new Date("2026-06-01T08:30:00.000Z"),
      answeredAt: null,
    });
  });
});

describe("CheckIn#endsAt and #joinEmphasisFrom", () => {
  it("ends one check-in duration after its start", () => {
    // arrange
    const requested = checkIn();

    // act
    const endsAt = requested.endsAt();

    // assert
    expect(endsAt).toEqual(ENDS_AT);
  });

  it("emphasises joining from ten minutes before the start", () => {
    // arrange
    const approved = approvedCheckIn();

    // act
    const emphasisFrom = approved.joinEmphasisFrom();

    // assert
    expect(emphasisFrom).toEqual(new Date("2026-06-03T08:50:00.000Z"));
  });
});

describe("CheckIn#statusAt", () => {
  it.each([
    [
      "a pending request before its start",
      checkIn(),
      "2026-06-03T08:59:59.999Z",
      "pending",
    ],
    [
      "a pending request at its start",
      checkIn(),
      "2026-06-03T09:00:00.000Z",
      "cancelled",
    ],
    [
      "a pending request after its start",
      checkIn(),
      "2026-06-03T09:30:00.000Z",
      "cancelled",
    ],
    [
      "an approved check-in before its end",
      approvedCheckIn(),
      "2026-06-03T09:59:59.999Z",
      "approved",
    ],
    [
      "an approved check-in at its end",
      approvedCheckIn(),
      "2026-06-03T10:00:00.000Z",
      "passed",
    ],
    [
      "a cancelled check-in before its start",
      checkIn({ recordedStatus: "cancelled" }),
      "2026-06-02T09:00:00.000Z",
      "cancelled",
    ],
    [
      "a cancelled check-in after its end",
      checkIn({ recordedStatus: "cancelled" }),
      "2026-06-04T09:00:00.000Z",
      "cancelled",
    ],
  ])("reads %s as %s", (_situation, subject, instant, expected) => {
    // arrange
    const now = new Date(instant);

    // act
    const status = subject.statusAt(now);

    // assert
    expect(status).toBe(expected);
  });
});

describe("CheckIn#awaits", () => {
  it("awaits the coach on a request the client proposed", () => {
    // arrange
    const requested = checkIn();

    // act
    const awaitsCoach = requested.awaits("coach");
    const awaitsClient = requested.awaits("client");

    // assert
    expect({ awaitsCoach, awaitsClient }).toEqual({
      awaitsCoach: true,
      awaitsClient: false,
    });
  });

  it("awaits the client on a time the coach proposed", () => {
    // arrange
    const proposed = checkIn({ initiatedBy: "coach", proposedBy: "coach" });

    // act
    const awaitsCoach = proposed.awaits("coach");
    const awaitsClient = proposed.awaits("client");

    // assert
    expect({ awaitsCoach, awaitsClient }).toEqual({
      awaitsCoach: false,
      awaitsClient: true,
    });
  });

  it("awaits nobody once the check-in is approved", () => {
    // arrange
    const approved = approvedCheckIn();

    // act
    const awaitsCoach = approved.awaits("coach");
    const awaitsClient = approved.awaits("client");

    // assert
    expect({ awaitsCoach, awaitsClient }).toEqual({
      awaitsCoach: false,
      awaitsClient: false,
    });
  });
});

describe("CheckIn#mayWithdraw", () => {
  it("lets the party who proposed a pending check-in withdraw it", () => {
    // arrange
    const requested = checkIn();

    // act
    const clientMay = requested.mayWithdraw("client");
    const coachMay = requested.mayWithdraw("coach");

    // assert
    expect({ clientMay, coachMay }).toEqual({
      clientMay: true,
      coachMay: false,
    });
  });

  it("lets nobody withdraw an approved check-in", () => {
    // arrange
    const approved = approvedCheckIn();

    // act
    const clientMay = approved.mayWithdraw("client");

    // assert
    expect(clientMay).toBe(false);
  });
});

describe("CheckIn#isJoinableAt", () => {
  it.each([
    [
      "an approved check-in a day before its start",
      approvedCheckIn(),
      "2026-06-02T09:00:00.000Z",
      true,
    ],
    [
      "an approved check-in during the meeting",
      approvedCheckIn(),
      "2026-06-03T09:30:00.000Z",
      true,
    ],
    [
      "an approved check-in at its end",
      approvedCheckIn(),
      "2026-06-03T10:00:00.000Z",
      false,
    ],
    [
      "a pending request before its start",
      checkIn(),
      "2026-06-03T08:55:00.000Z",
      false,
    ],
    [
      "a cancelled check-in before its start",
      checkIn({ recordedStatus: "cancelled" }),
      "2026-06-03T08:55:00.000Z",
      false,
    ],
  ])("judges %s joinable: %s", (_situation, subject, instant, expected) => {
    // arrange
    const now = new Date(instant);

    // act
    const joinable = subject.isJoinableAt(now);

    // assert
    expect(joinable).toBe(expected);
  });
});

describe("CheckIn#answerRefusalFor", () => {
  it("lets the coach answer a request awaiting her before its start", () => {
    // arrange
    const requested = checkIn();

    // act
    const refusal = requested.answerRefusalFor({
      party: "coach",
      at: new Date("2026-06-02T09:00:00.000Z"),
    });

    // assert
    expect(refusal).toBeNull();
  });

  it.each([
    [
      "an approved check-in",
      approvedCheckIn(),
      "coach",
      "2026-06-02T09:00:00.000Z",
      "not_pending",
    ],
    [
      "a cancelled check-in",
      checkIn({ recordedStatus: "cancelled" }),
      "coach",
      "2026-06-02T09:00:00.000Z",
      "not_pending",
    ],
    [
      "a request that reached its start unanswered",
      checkIn(),
      "coach",
      "2026-06-03T09:00:00.000Z",
      "expired",
    ],
    [
      "her own request",
      checkIn(),
      "client",
      "2026-06-02T09:00:00.000Z",
      "not_your_turn",
    ],
  ] as const)(
    "refuses an answer to %s",
    (_situation, subject, party, instant, expected) => {
      // arrange
      const at = new Date(instant);

      // act
      const refusal = subject.answerRefusalFor({ party, at });

      // assert
      expect(refusal).toBe(expected);
    },
  );
});

describe("CheckIn#withdrawalRefusalFor", () => {
  it("lets the client withdraw her pending request before its start", () => {
    // arrange
    const requested = checkIn();

    // act
    const refusal = requested.withdrawalRefusalFor({
      party: "client",
      at: new Date("2026-06-02T09:00:00.000Z"),
    });

    // assert
    expect(refusal).toBeNull();
  });

  it.each([
    [
      "an approved check-in",
      approvedCheckIn(),
      "client",
      "2026-06-02T09:00:00.000Z",
      "not_pending",
    ],
    [
      "a request that reached its start",
      checkIn(),
      "client",
      "2026-06-03T09:00:00.000Z",
      "expired",
    ],
    [
      "a request the other party proposed",
      checkIn(),
      "coach",
      "2026-06-02T09:00:00.000Z",
      "not_your_turn",
    ],
  ] as const)(
    "refuses withdrawing %s",
    (_situation, subject, party, instant, expected) => {
      // arrange
      const at = new Date(instant);

      // act
      const refusal = subject.withdrawalRefusalFor({ party, at });

      // assert
      expect(refusal).toBe(expected);
    },
  );
});

describe("CheckIn#settled", () => {
  it("records the approval and when it was given", () => {
    // arrange
    const requested = checkIn();
    const at = new Date("2026-06-02T09:00:00.000Z");

    // act
    const approved = requested.settled({ outcome: "approved", at });

    // assert
    expect({
      recordedStatus: approved.recordedStatus,
      answeredAt: approved.answeredAt,
    }).toEqual({ recordedStatus: "approved", answeredAt: at });
  });

  it("records a cancellation and when it was made", () => {
    // arrange
    const requested = checkIn();
    const at = new Date("2026-06-02T09:00:00.000Z");

    // act
    const cancelled = requested.settled({ outcome: "cancelled", at });

    // assert
    expect({
      recordedStatus: cancelled.recordedStatus,
      answeredAt: cancelled.answeredAt,
    }).toEqual({ recordedStatus: "cancelled", answeredAt: at });
  });
});

describe("CheckIn#settled with the answering client's zone", () => {
  it("replaces the client's zone with the one she answered from", () => {
    // arrange
    const proposed = checkIn({ initiatedBy: "coach", proposedBy: "coach" });
    const at = new Date("2026-06-02T09:00:00.000Z");

    // act
    const declined = proposed.settled({
      outcome: "cancelled",
      at,
      clientTimeZone: zoneOf("Asia/Tokyo"),
    });

    // assert
    expect(declined.clientTimeZone).toBe("Asia/Tokyo");
  });

  it("keeps the recorded zone when no zone comes with the answer", () => {
    // arrange
    const requested = checkIn();
    const at = new Date("2026-06-02T09:00:00.000Z");

    // act
    const approved = requested.settled({ outcome: "approved", at });

    // assert
    expect(approved.clientTimeZone).toBe("Europe/London");
  });
});

describe("CheckIn#isWaitingRequestAt", () => {
  const beforeStart = new Date("2026-06-02T09:00:00.000Z");

  it.each([
    {
      situation: "her pending request before it starts",
      at: beforeStart,
      waiting: true,
    },
    {
      situation: "her pending request once its start has come",
      at: STARTS_AT,
      waiting: false,
    },
    {
      situation: "her approved check-in",
      props: { recordedStatus: "approved" },
      at: beforeStart,
      waiting: false,
    },
    {
      situation: "a pending time the coach initiated",
      props: { initiatedBy: "coach", proposedBy: "coach" },
      at: beforeStart,
      waiting: false,
    },
  ] as const)(
    "holds $situation as waiting: $waiting",
    ({ props, at, waiting }) => {
      // arrange
      const candidate = checkIn(props);

      // act
      const isWaiting = candidate.isWaitingRequestAt(at);

      // assert
      expect(isWaiting).toBe(waiting);
    },
  );
});

describe("CheckIn#viewFor", () => {
  const beforeStart = new Date("2026-06-02T09:00:00.000Z");

  it("shows the snapshot with the status at that instant", () => {
    // arrange
    const requested = checkIn();

    // act
    const view = requested.viewFor({ party: "client", at: STARTS_AT });

    // assert
    expect(view).toEqual({
      ...requested.toSnapshot(),
      status: "cancelled",
      awaitsViewer: false,
      viewerMayWithdraw: false,
      isWaitingRequest: false,
    });
  });

  it("shows her waiting request as hers to withdraw and the coach's to answer", () => {
    // arrange
    const requested = checkIn();

    // act
    const clientView = requested.viewFor({ party: "client", at: beforeStart });
    const coachView = requested.viewFor({ party: "coach", at: beforeStart });

    // assert
    expect([clientView, coachView].map(turnOf)).toEqual([
      {
        awaitsViewer: false,
        viewerMayWithdraw: true,
        isWaitingRequest: true,
      },
      {
        awaitsViewer: true,
        viewerMayWithdraw: false,
        isWaitingRequest: true,
      },
    ]);
  });

  it("shows an approved check-in as nobody's turn", () => {
    // arrange
    const approved = approvedCheckIn();

    // act
    const view = approved.viewFor({ party: "coach", at: beforeStart });

    // assert
    expect(turnOf(view)).toEqual({
      awaitsViewer: false,
      viewerMayWithdraw: false,
      isWaitingRequest: false,
    });
  });

  function turnOf(view: ReturnType<CheckIn["viewFor"]>) {
    return {
      awaitsViewer: view.awaitsViewer,
      viewerMayWithdraw: view.viewerMayWithdraw,
      isWaitingRequest: view.isWaitingRequest,
    };
  }
});

describe("CheckIn.decideRequest", () => {
  const at = new Date("2026-06-02T09:00:00.000Z");
  const waitingRequest = checkIn({ id: "check-in-0" });
  const startedRequest = checkIn({
    id: "check-in-0",
    startsAt: new Date("2026-06-02T08:00:00.000Z"),
  });
  const approved = approvedCheckIn();

  it.each([
    {
      situation: "the hour reserved and nothing waiting",
      coachTime: "reserved",
      clientCheckIns: [],
      expected: "requested",
    },
    {
      situation: "the hour reserved and a request waiting",
      coachTime: "reserved",
      clientCheckIns: [waitingRequest],
      expected: "request_waiting",
    },
    {
      situation:
        "the hour reserved beside a request that has started and an approved check-in",
      coachTime: "reserved",
      clientCheckIns: [startedRequest, approved],
      expected: "requested",
    },
    {
      situation: "the hour reserved and only a coach request waiting",
      coachTime: "reserved",
      clientCheckIns: [
        checkIn({
          id: "check-in-4",
          initiatedBy: "coach",
          proposedBy: "coach",
        }),
      ],
      expected: "requested",
    },
    {
      situation: "the hour taken and nothing waiting",
      coachTime: "taken",
      clientCheckIns: [],
      expected: "time_taken",
    },
    {
      situation: "the hour taken and a request waiting",
      coachTime: "taken",
      clientCheckIns: [approved, waitingRequest],
      expected: "request_waiting",
    },
  ] as const)(
    "decides her request with $situation as $expected",
    ({ coachTime, clientCheckIns, expected }) => {
      // arrange
      const learned = {
        initiatedBy: "client" as const,
        coachTime,
        clientCheckIns,
        at,
      };

      // act
      const decision = CheckIn.decideRequest(learned);

      // assert
      expect(decision).toBe(expected);
    },
  );

  it.each([
    {
      situation: "a client request waiting",
      clientCheckIns: [waitingRequest],
      coachTime: "reserved",
      expected: "requested",
    },
    {
      situation: "her own earlier request waiting",
      clientCheckIns: [checkIn({ initiatedBy: "coach", proposedBy: "coach" })],
      coachTime: "reserved",
      expected: "requested",
    },
    {
      situation: "the hour taken",
      clientCheckIns: [],
      coachTime: "taken",
      expected: "time_taken",
    },
  ] as const)(
    "decides the coach's request with $situation as $expected",
    ({ coachTime, clientCheckIns, expected }) => {
      // arrange
      const learned = {
        initiatedBy: "coach" as const,
        coachTime,
        clientCheckIns,
        at,
      };

      // act
      const decision = CheckIn.decideRequest(learned);

      // assert
      expect(decision).toBe(expected);
    },
  );

  it("still refuses her request while a coach request and her own request wait", () => {
    // arrange
    const learned = {
      initiatedBy: "client" as const,
      coachTime: "reserved" as const,
      clientCheckIns: [
        checkIn({
          id: "check-in-5",
          initiatedBy: "coach",
          proposedBy: "coach",
        }),
        waitingRequest,
      ],
      at,
    };

    // act
    const decision = CheckIn.decideRequest(learned);

    // assert
    expect(decision).toBe("request_waiting");
  });
});
