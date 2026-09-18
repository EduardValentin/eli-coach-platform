import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilitySource,
} from "../coach-availability";

import type { AssessmentCallNotifications } from "./assessment-call-notifications";
import type { AssessmentCallReservations } from "./assessment-call-reservations";
import { AssessmentCall } from "./assessment-call";
import { BookAssessmentCallUseCase } from "./book-assessment-call-use-case";
import { ListOpenSlotsUseCase } from "./list-open-slots-use-case";
import type { MeetingRoomLink } from "./meeting-room-link";
import { ResolveJoinLinkUseCase } from "./resolve-join-link-use-case";

const NOW = new Date("2026-06-01T06:00:00.000Z");
const OPEN_START = new Date("2026-06-01T15:00:00.000Z");
const CLOSED_START = new Date("2026-06-01T13:00:00.000Z");
const COACH_TIME_ZONE = "Europe/Bucharest";

const clock = { now: () => NOW };

function createLogger() {
  return { error: vi.fn() };
}

function createAvailabilitySource(): CoachAvailabilitySource {
  return {
    current: vi.fn().mockResolvedValue(
      CoachAvailability.configure({
        timeZone: COACH_TIME_ZONE,
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        startHour: 17,
        endHour: 20,
      }),
    ),
  };
}

function existingCall(props?: {
  id?: string;
  visitorEmail?: string;
}): AssessmentCall {
  return AssessmentCall.reconstitute({
    id: props?.id ?? "call-1",
    visitorName: "Ana Popescu",
    visitorEmail: props?.visitorEmail ?? "ana@example.com",
    visitorNotes: null,
    startsAt: OPEN_START,
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: COACH_TIME_ZONE,
    bookedAt: new Date("2026-05-30T09:12:00.000Z"),
  });
}

function createReservations(
  options?: Partial<AssessmentCallReservations>,
): AssessmentCallReservations {
  return {
    reserve: vi
      .fn()
      .mockResolvedValue({ status: "reserved", call: existingCall() }),
    reservedStartsFrom: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    ...options,
  };
}

function createNotifications(
  delivery?: Awaited<ReturnType<AssessmentCallNotifications["notifyBooked"]>>,
): AssessmentCallNotifications {
  return {
    notifyBooked: vi
      .fn()
      .mockResolvedValue(delivery ?? { visitor: "sent", coach: "sent" }),
  };
}

function createListOpenSlots(options: {
  availability: CoachAvailabilitySource;
  logger: ReturnType<typeof createLogger>;
  reservations: AssessmentCallReservations;
}): ListOpenSlotsUseCase {
  return new ListOpenSlotsUseCase({
    availability: options.availability,
    bookingOpen: true,
    clock,
    logger: options.logger,
    reservations: options.reservations,
  });
}

function createBookAssessmentCall(options: {
  availability: CoachAvailabilitySource;
  logger: ReturnType<typeof createLogger>;
  notifications: AssessmentCallNotifications;
  reservations: AssessmentCallReservations;
}): BookAssessmentCallUseCase {
  return new BookAssessmentCallUseCase({
    availability: options.availability,
    bookingOpen: true,
    clock,
    coachTimeZone: COACH_TIME_ZONE,
    logger: options.logger,
    notifications: options.notifications,
    reservations: options.reservations,
  });
}

const bookingCommand = {
  startsAt: OPEN_START,
  fullName: "Ana Popescu",
  email: "  Ana@Example.COM ",
  notes: "Training around a desk job.",
  visitorTimeZone: "Europe/Bucharest",
};

describe("ListOpenSlotsUseCase", () => {
  it("reports closed without reading availability when booking is closed", async () => {
    // arrange
    const availability = createAvailabilitySource();
    const reservations = createReservations();
    const listOpenSlots = new ListOpenSlotsUseCase({
      availability,
      bookingOpen: false,
      clock,
      logger: createLogger(),
      reservations,
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(availability.current).not.toHaveBeenCalled();
    expect(reservations.reservedStartsFrom).not.toHaveBeenCalled();
  });

  it("offers the coach time zone and the starts left after reservations", async () => {
    // arrange
    const reservations = createReservations({
      reservedStartsFrom: vi.fn().mockResolvedValue([OPEN_START]),
    });
    const listOpenSlots = createListOpenSlots({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      reservations,
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(reservations.reservedStartsFrom).toHaveBeenCalledWith(NOW);
    expect(result).toEqual({
      status: "open",
      coachTimeZone: COACH_TIME_ZONE,
      slots: expect.arrayContaining([new Date("2026-06-01T14:00:00.000Z")]),
    });
    expect(
      result.status === "open" &&
        result.slots.some((slot) => slot.getTime() === OPEN_START.getTime()),
    ).toBe(false);
  });

  it("reports unavailable and logs when the availability source throws", async () => {
    // arrange
    const logger = createLogger();
    const listOpenSlots = createListOpenSlots({
      availability: { current: vi.fn().mockRejectedValue(new Error("down")) },
      logger,
      reservations: createReservations(),
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
      errorCategory: "assessment_call_slots_failure",
    });
  });

  it("reports unavailable and logs when the reservations repository throws", async () => {
    // arrange
    const logger = createLogger();
    const listOpenSlots = createListOpenSlots({
      availability: createAvailabilitySource(),
      logger,
      reservations: createReservations({
        reservedStartsFrom: vi.fn().mockRejectedValue(new Error("down")),
      }),
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
      errorCategory: "assessment_call_slots_failure",
    });
  });
});

describe("BookAssessmentCallUseCase", () => {
  it("reports closed without reserving when booking is closed", async () => {
    // arrange
    const reservations = createReservations();
    const bookAssessmentCall = new BookAssessmentCallUseCase({
      availability: createAvailabilitySource(),
      bookingOpen: false,
      clock,
      coachTimeZone: COACH_TIME_ZONE,
      logger: createLogger(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(reservations.reserve).not.toHaveBeenCalled();
  });

  it("refuses a start the availability no longer offers", async () => {
    // arrange
    const reservations = createReservations();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute({
      ...bookingCommand,
      startsAt: CLOSED_START,
    });

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
    expect(reservations.reserve).not.toHaveBeenCalled();
  });

  it("reserves with the normalised email and the clock instants, then notifies", async () => {
    // arrange
    const reservations = createReservations();
    const notifications = createNotifications();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      notifications,
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(reservations.reserve).toHaveBeenCalledWith({
      bookedAt: NOW,
      coachTimeZone: COACH_TIME_ZONE,
      fullName: "Ana Popescu",
      normalizedEmail: "ana@example.com",
      notes: "Training around a desk job.",
      now: NOW,
      startsAt: OPEN_START,
      visitorTimeZone: "Europe/Bucharest",
    });
    expect(notifications.notifyBooked).toHaveBeenCalledWith(
      existingCall().toSnapshot(),
    );
    expect(result).toEqual({ status: "booked", call: existingCall() });
  });

  it.each([
    [{ visitor: "failed", coach: "sent" } as const, 1],
    [{ visitor: "sent", coach: "failed" } as const, 1],
    [{ visitor: "failed", coach: "failed" } as const, 2],
  ])("logs the failed legs of %o", async (delivery, failures) => {
    // arrange
    const logger = createLogger();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger,
      notifications: createNotifications(delivery),
      reservations: createReservations(),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: existingCall() });
    expect(logger.error).toHaveBeenCalledTimes(failures);
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
      errorCategory: "assessment_call_notification_failure",
      recipient: expect.any(String),
    });
  });

  it("keeps the booking when the notification port throws", async () => {
    // arrange
    const logger = createLogger();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger,
      notifications: { notifyBooked: vi.fn().mockRejectedValue(new Error()) },
      reservations: createReservations(),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: existingCall() });
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it("resolves the visitor's own retry of the same slot to their existing call", async () => {
    // arrange
    const existing = existingCall();
    const notifications = createNotifications();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      notifications,
      reservations: createReservations({
        reserve: vi.fn().mockResolvedValue({ status: "slot_taken", existing }),
      }),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: existing });
    expect(notifications.notifyBooked).not.toHaveBeenCalled();
  });

  it("refuses a slot another visitor took first", async () => {
    // arrange
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      notifications: createNotifications(),
      reservations: createReservations({
        reserve: vi.fn().mockResolvedValue({
          status: "slot_taken",
          existing: existingCall({ visitorEmail: "other@example.com" }),
        }),
      }),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
  });

  it("reports the email's upcoming call instead of booking a second one", async () => {
    // arrange
    const existing = existingCall({ id: "call-2" });
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      logger: createLogger(),
      notifications: createNotifications(),
      reservations: createReservations({
        reserve: vi
          .fn()
          .mockResolvedValue({ status: "email_has_upcoming_call", existing }),
      }),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "email_already_booked", existing });
  });
});

describe("ResolveJoinLinkUseCase", () => {
  it("resolves the meeting room link of a known booking", async () => {
    // arrange
    const call = existingCall();
    const meetingRoomLink = {
      forCall: vi.fn().mockResolvedValue("https://meet.example.com/call-1"),
    } satisfies MeetingRoomLink;
    const resolveJoinLink = new ResolveJoinLinkUseCase({
      meetingRoomLink,
      reservations: createReservations({
        findById: vi.fn().mockResolvedValue(call),
      }),
    });

    // act
    const result = await resolveJoinLink.execute("call-1");

    // assert
    expect(meetingRoomLink.forCall).toHaveBeenCalledWith(call.toSnapshot());
    expect(result).toEqual({
      status: "found",
      url: "https://meet.example.com/call-1",
    });
  });

  it("reports an unknown booking", async () => {
    // arrange
    const meetingRoomLink = { forCall: vi.fn() } satisfies MeetingRoomLink;
    const resolveJoinLink = new ResolveJoinLinkUseCase({
      meetingRoomLink,
      reservations: createReservations(),
    });

    // act
    const result = await resolveJoinLink.execute("missing");

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(meetingRoomLink.forCall).not.toHaveBeenCalled();
  });
});
