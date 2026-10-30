import { describe, expect, it, vi } from "vitest";

import { CoachScheduleAvailabilityAdapter } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/coach-schedule/coach-schedule-availability-adapter.server";
import {
  CoachAvailability as CoachWeekAvailability,
  CoachOpenings,
} from "~/bounded-contexts/scheduling/coach-schedule/public/coach-time";
import {
  createEmailAcceptance,
  type EmailSubaddressPolicy,
} from "~/shared/submission-checks/email-address";

import { AssessmentCall } from "./assessment-call";
import { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallNotificationsPort } from "./assessment-call-notifications-port";
import type { AssessmentCallReservationsPort } from "./assessment-call-reservations-port";
import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";
import type { CoachAvailabilityPort } from "./coach-availability-port";
import type { CoachTimePort } from "./coach-time-port";
import type { MeetingRoomPort } from "./meeting-room-port";
import type { WaitlistModePort } from "./waitlist-mode-port";
import { BookAssessmentCallUseCase } from "./book-assessment-call-use-case";
import {
  ListAssessmentCallsUseCase,
  type AssessmentCallListingResult,
} from "./list-assessment-calls-use-case";
import { ListOpenSlotsUseCase } from "./list-open-slots-use-case";
import { ResolveJoinLinkUseCase } from "./resolve-join-link-use-case";

const NOW = new Date("2026-06-01T06:00:00.000Z");
const OPEN_START = new Date("2026-06-01T15:00:00.000Z");
const CLOSED_START = new Date("2026-06-01T13:00:00.000Z");
const COACH_TIME_ZONE = "Europe/Bucharest";
const RESERVATION_ID = "reservation-1";

type OpeningsSources = ConstructorParameters<typeof CoachOpenings>[0];
type CoachAvailabilitySource = OpeningsSources["coachAvailabilitySourcePort"];
type CoachCalendar = OpeningsSources["coachCalendarPort"];
type CoachAvailabilityProps = Parameters<typeof CoachWeekAvailability.from>[0];

const clock = { now: () => NOW };

function createIncidents() {
  return {
    bookingModeReadFailed: vi.fn(),
    callsReadFailed: vi.fn(),
    notificationFailed: vi.fn(),
    slotsReadFailed: vi.fn(),
  };
}

function createBookingWindow(options: {
  waitlistModePort: WaitlistModePort;
  incidents?: ReturnType<typeof createIncidents>;
}): AssessmentCallBookingWindow {
  return new AssessmentCallBookingWindow({
    assessmentCallIncidentsPort: options.incidents ?? createIncidents(),
    waitlistModePort: options.waitlistModePort,
  });
}

function openBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    waitlistModePort: { isEnabled: vi.fn().mockResolvedValue(false) },
  });
}

function closedBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    waitlistModePort: { isEnabled: vi.fn().mockResolvedValue(true) },
  });
}

function configuredAvailabilityOrThrow(
  props: CoachAvailabilityProps,
): CoachWeekAvailability {
  const result = CoachWeekAvailability.from(props);

  if (result.status !== "configured") {
    throw new Error(
      `Expected a configured availability, got problems: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

function createAvailabilitySource(
  timeZone: string = COACH_TIME_ZONE,
): CoachAvailabilitySource {
  return {
    current: vi.fn().mockResolvedValue(
      configuredAvailabilityOrThrow({
        timeZone,
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        startHour: 17,
        endHour: 20,
      }),
    ),
  };
}

function existingCall(props?: {
  id?: string;
  startsAt?: Date;
  visitorEmail?: string;
}): AssessmentCall {
  return AssessmentCall.reconstitute({
    id: props?.id ?? "call-1",
    firstName: "Ana",
    lastName: "Popescu",
    visitorEmail: props?.visitorEmail ?? "ana@example.com",
    visitorNotes: null,
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone: null,
    startsAt: props?.startsAt ?? OPEN_START,
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: COACH_TIME_ZONE,
    bookedAt: new Date("2026-05-30T09:12:00.000Z"),
  });
}

const bookedCall = AssessmentCall.booked({
  id: "call-new",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training around a desk job.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: OPEN_START,
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: COACH_TIME_ZONE,
  at: NOW,
});

const callIds = { generate: () => "call-new" };

function createReservations(
  assessmentCallReservationsPort?: Partial<AssessmentCallReservationsPort>,
): AssessmentCallReservationsPort {
  return {
    lockVisitorEmail: vi.fn().mockResolvedValue(undefined),
    findUpcomingCallFor: vi.fn().mockResolvedValue(null),
    add: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    listAll: vi.fn().mockResolvedValue([]),
    ...assessmentCallReservationsPort,
  };
}

function createCoachTime(
  coachTimePort?: Partial<CoachTimePort>,
): CoachTimePort {
  return {
    reserve: vi
      .fn()
      .mockResolvedValue({ status: "reserved", reservationId: RESERVATION_ID }),
    release: vi.fn().mockResolvedValue(undefined),
    ...coachTimePort,
  };
}

function createCalendar(options?: Partial<CoachCalendar>): CoachCalendar {
  return {
    busyFrom: vi.fn().mockResolvedValue([]),
    ...options,
  };
}

function availabilityOver(
  availability: CoachAvailabilitySource,
  calendar: CoachCalendar = createCalendar(),
): CoachAvailabilityPort {
  return new CoachScheduleAvailabilityAdapter({
    openings: new CoachOpenings({
      coachAvailabilitySourcePort: availability,
      coachCalendarPort: calendar,
    }),
    rules: ASSESSMENT_CALL_RULES,
  });
}

function createNotifications(
  delivery?: Awaited<
    ReturnType<AssessmentCallNotificationsPort["notifyBooked"]>
  >,
): AssessmentCallNotificationsPort {
  return {
    notifyBooked: vi
      .fn()
      .mockResolvedValue(delivery ?? { visitor: "sent", coach: "sent" }),
  };
}

function createListOpenSlots(options: {
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  incidents: ReturnType<typeof createIncidents>;
}): ListOpenSlotsUseCase {
  return new ListOpenSlotsUseCase({
    coachAvailabilityPort: availabilityOver(
      options.availability,
      options.calendar,
    ),
    bookingWindow: openBookingWindow(),
    clockPort: clock,
    assessmentCallIncidentsPort: options.incidents,
  });
}

function createBookAssessmentCall(options: {
  availability: CoachAvailabilitySource;
  coachTimePort?: CoachTimePort;
  emailSubaddresses?: EmailSubaddressPolicy;
  incidents: ReturnType<typeof createIncidents>;
  assessmentCallNotificationsPort: AssessmentCallNotificationsPort;
  assessmentCallReservationsPort: AssessmentCallReservationsPort;
}): BookAssessmentCallUseCase {
  return new BookAssessmentCallUseCase({
    coachAvailabilityPort: availabilityOver(options.availability),
    bookingWindow: openBookingWindow(),
    clockPort: clock,
    coachTimePort: options.coachTimePort ?? createCoachTime(),
    emailAcceptancePort: createEmailAcceptance(
      options.emailSubaddresses ?? "allowed",
    ),
    assessmentCallIdsPort: callIds,
    assessmentCallIncidentsPort: options.incidents,
    assessmentCallNotificationsPort: options.assessmentCallNotificationsPort,
    assessmentCallReservationsPort: options.assessmentCallReservationsPort,
  });
}

const bookingCommand = {
  startsAt: OPEN_START,
  firstName: "Ana",
  lastName: "Popescu",
  email: "  Ana@Example.COM ",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  notes: "Training around a desk job.",
  visitorTimeZone: "Europe/Bucharest",
} as const;

function loadedListing(result: AssessmentCallListingResult) {
  if (result.status !== "ok") {
    throw new Error(`expected a loaded listing, got ${result.status}`);
  }

  return result;
}

describe("AssessmentCallBookingWindow", () => {
  it("stays closed while the site is in waitlist mode", async () => {
    // arrange
    const bookingWindow = closedBookingWindow();

    // act
    const open = await bookingWindow.isOpen();

    // assert
    expect(open).toBe(false);
  });

  it("opens once waitlist mode is switched off", async () => {
    // arrange
    const bookingWindow = openBookingWindow();

    // act
    const open = await bookingWindow.isOpen();

    // assert
    expect(open).toBe(true);
  });

  it("stays closed and records the incident when the mode cannot be read", async () => {
    // arrange
    const incidents = createIncidents();
    const bookingWindow = createBookingWindow({
      waitlistModePort: {
        isEnabled: vi.fn().mockRejectedValue(new Error("down")),
      },
      incidents,
    });

    // act
    const open = await bookingWindow.isOpen();

    // assert
    expect(open).toBe(false);
    expect(incidents.bookingModeReadFailed).toHaveBeenCalledOnce();
  });
});

describe("ListOpenSlotsUseCase", () => {
  it("reports closed without reading availability when booking is closed", async () => {
    // arrange
    const coachAvailabilitySourcePort = createAvailabilitySource();
    const coachCalendarPort = createCalendar();
    const listOpenSlotsUseCase = new ListOpenSlotsUseCase({
      coachAvailabilityPort: availabilityOver(
        coachAvailabilitySourcePort,
        coachCalendarPort,
      ),
      bookingWindow: closedBookingWindow(),
      clockPort: clock,
      assessmentCallIncidentsPort: createIncidents(),
    });

    // act
    const result = await listOpenSlotsUseCase.execute();

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(coachAvailabilitySourcePort.current).not.toHaveBeenCalled();
    expect(coachCalendarPort.busyFrom).not.toHaveBeenCalled();
  });

  it("offers the coach time zone and the starts the coach's busy time leaves free", async () => {
    // arrange
    const coachCalendarPort = createCalendar({
      busyFrom: vi.fn().mockResolvedValue([
        {
          start: new Date("2026-06-01T15:15:00.000Z"),
          end: new Date("2026-06-01T15:45:00.000Z"),
        },
      ]),
    });
    const listOpenSlotsUseCase = createListOpenSlots({
      availability: createAvailabilitySource(),
      calendar: coachCalendarPort,
      incidents: createIncidents(),
    });

    // act
    const result = await listOpenSlotsUseCase.execute();

    // assert
    expect(coachCalendarPort.busyFrom).toHaveBeenCalledWith(NOW);
    expect(result).toEqual({
      status: "open",
      coachTimeZone: COACH_TIME_ZONE,
      slots: expect.arrayContaining([
        new Date("2026-06-01T14:00:00.000Z"),
        new Date("2026-06-01T16:00:00.000Z"),
      ]),
    });
    expect(
      result.status === "open" &&
        result.slots.some((slot) => slot.getTime() === OPEN_START.getTime()),
    ).toBe(false);
  });

  it("reports unavailable and logs when the availability source throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listOpenSlotsUseCase = createListOpenSlots({
      availability: { current: vi.fn().mockRejectedValue(new Error("down")) },
      calendar: createCalendar(),
      incidents,
    });

    // act
    const result = await listOpenSlotsUseCase.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.slotsReadFailed).toHaveBeenCalledOnce();
  });

  it("lets a fault in the slot arithmetic surface instead of reporting empty", async () => {
    // arrange
    const incidents = createIncidents();
    const coachAvailabilitySourcePort = createAvailabilitySource();
    const configured = await coachAvailabilitySourcePort.current();
    vi.spyOn(configured, "openSlotStarts").mockImplementation(() => {
      throw new RangeError("Invalid time zone specified: Europe/Bucarest");
    });
    const listOpenSlotsUseCase = createListOpenSlots({
      availability: coachAvailabilitySourcePort,
      calendar: createCalendar(),
      incidents,
    });

    // act
    const execute = listOpenSlotsUseCase.execute();

    // assert
    await expect(execute).rejects.toThrow(/Invalid time zone/);
    expect(incidents.slotsReadFailed).not.toHaveBeenCalled();
  });

  it("reports unavailable and logs when the coach calendar throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listOpenSlotsUseCase = createListOpenSlots({
      availability: createAvailabilitySource(),
      calendar: createCalendar({
        busyFrom: vi.fn().mockRejectedValue(new Error("down")),
      }),
      incidents,
    });

    // act
    const result = await listOpenSlotsUseCase.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.slotsReadFailed).toHaveBeenCalledOnce();
  });
});

describe("ListAssessmentCallsUseCase", () => {
  it("lists the coach's calls as snapshots carrying their end, in her time zone", async () => {
    // arrange
    const call = existingCall();
    const listAssessmentCallsUseCase = new ListAssessmentCallsUseCase({
      coachAvailabilityPort: availabilityOver(
        createAvailabilitySource("Europe/Chisinau"),
      ),
      assessmentCallIncidentsPort: createIncidents(),
      assessmentCallReservationsPort: createReservations({
        listAll: vi.fn().mockResolvedValue([call]),
      }),
    });

    // act
    const listing = loadedListing(await listAssessmentCallsUseCase.execute());

    // assert
    expect(listing).toEqual({
      status: "ok",
      coachTimeZone: "Europe/Chisinau",
      calls: [call.toSnapshot()],
    });
    expect(listing.calls[0]?.endsAt).toEqual(call.endsAt());
  });

  it("keeps the order the reservations hand it", async () => {
    // arrange
    const earlier = existingCall({ id: "call-1", startsAt: OPEN_START });
    const later = existingCall({
      id: "call-2",
      startsAt: new Date("2026-06-02T15:00:00.000Z"),
    });
    const listAssessmentCallsUseCase = new ListAssessmentCallsUseCase({
      coachAvailabilityPort: availabilityOver(createAvailabilitySource()),
      assessmentCallIncidentsPort: createIncidents(),
      assessmentCallReservationsPort: createReservations({
        listAll: vi.fn().mockResolvedValue([earlier, later]),
      }),
    });

    // act
    const listing = loadedListing(await listAssessmentCallsUseCase.execute());

    // assert
    expect(listing.calls.map((call) => call.id)).toEqual(["call-1", "call-2"]);
  });

  it("still names the coach's time zone when she has no calls", async () => {
    // arrange
    const listAssessmentCallsUseCase = new ListAssessmentCallsUseCase({
      coachAvailabilityPort: availabilityOver(createAvailabilitySource()),
      assessmentCallIncidentsPort: createIncidents(),
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const listing = await listAssessmentCallsUseCase.execute();

    // assert
    expect(listing).toEqual({
      status: "ok",
      coachTimeZone: COACH_TIME_ZONE,
      calls: [],
    });
  });

  it("reports unavailable and logs when the reservations read throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listAssessmentCallsUseCase = new ListAssessmentCallsUseCase({
      coachAvailabilityPort: availabilityOver(createAvailabilitySource()),
      assessmentCallIncidentsPort: incidents,
      assessmentCallReservationsPort: createReservations({
        listAll: vi.fn().mockRejectedValue(new Error("down")),
      }),
    });

    // act
    const listing = await listAssessmentCallsUseCase.execute();

    // assert
    expect(listing).toEqual({ status: "unavailable" });
    expect(incidents.callsReadFailed).toHaveBeenCalledOnce();
  });

  it("reports unavailable and logs when the availability read throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listAssessmentCallsUseCase = new ListAssessmentCallsUseCase({
      coachAvailabilityPort: availabilityOver({
        current: vi.fn().mockRejectedValue(new Error("down")),
      }),
      assessmentCallIncidentsPort: incidents,
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const listing = await listAssessmentCallsUseCase.execute();

    // assert
    expect(listing).toEqual({ status: "unavailable" });
    expect(incidents.callsReadFailed).toHaveBeenCalledOnce();
  });
});

describe("BookAssessmentCallUseCase", () => {
  it("reports closed without reserving when booking is closed", async () => {
    // arrange
    const assessmentCallReservationsPort = createReservations();
    const coachTimePort = createCoachTime();
    const bookAssessmentCallUseCase = new BookAssessmentCallUseCase({
      coachAvailabilityPort: availabilityOver(createAvailabilitySource()),
      bookingWindow: closedBookingWindow(),
      clockPort: clock,
      coachTimePort,
      emailAcceptancePort: createEmailAcceptance("allowed"),
      assessmentCallIdsPort: callIds,
      assessmentCallIncidentsPort: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(coachTimePort.reserve).not.toHaveBeenCalled();
    expect(assessmentCallReservationsPort.add).not.toHaveBeenCalled();
  });

  it("refuses a start the availability no longer offers", async () => {
    // arrange
    const assessmentCallReservationsPort = createReservations();
    const coachTimePort = createCoachTime();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTimePort,
      incidents: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute({
      ...bookingCommand,
      startsAt: CLOSED_START,
    });

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
    expect(coachTimePort.reserve).not.toHaveBeenCalled();
    expect(assessmentCallReservationsPort.add).not.toHaveBeenCalled();
  });

  it("reserves a call under a fresh id with the visitor's profile, the normalised email and the clock instants, then notifies", async () => {
    // arrange
    const assessmentCallReservationsPort = createReservations();
    const assessmentCallNotificationsPort = createNotifications();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents: createIncidents(),
      assessmentCallNotificationsPort,
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(
      assessmentCallReservationsPort.lockVisitorEmail,
    ).toHaveBeenCalledWith("ana@example.com");
    expect(
      assessmentCallReservationsPort.findUpcomingCallFor,
    ).toHaveBeenCalledWith({
      visitorEmail: "ana@example.com",
      now: NOW,
    });
    expect(assessmentCallReservationsPort.add).toHaveBeenCalledWith({
      call: bookedCall,
      reservationId: RESERVATION_ID,
    });
    expect(assessmentCallNotificationsPort.notifyBooked).toHaveBeenCalledWith(
      bookedCall.toSnapshot(),
    );
    expect(result).toEqual({ status: "booked", call: bookedCall });
  });

  it("reserves with the time zone the availability source carries", async () => {
    // arrange
    const assessmentCallReservationsPort = createReservations();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource("Europe/Chisinau"),
      incidents: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort,
    });

    // act
    await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(assessmentCallReservationsPort.add).toHaveBeenCalledWith(
      expect.objectContaining({
        call: expect.objectContaining({ coachTimeZone: "Europe/Chisinau" }),
      }),
    );
  });

  it.each([
    [{ visitor: "failed", coach: "sent" } as const, 1],
    [{ visitor: "sent", coach: "failed" } as const, 1],
    [{ visitor: "failed", coach: "failed" } as const, 2],
  ])("logs the failed legs of %o", async (delivery, failures) => {
    // arrange
    const incidents = createIncidents();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents,
      assessmentCallNotificationsPort: createNotifications(delivery),
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: bookedCall });
    expect(incidents.notificationFailed).toHaveBeenCalledTimes(failures);
  });

  it("keeps the booking when the notification port throws", async () => {
    // arrange
    const incidents = createIncidents();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents,
      assessmentCallNotificationsPort: {
        notifyBooked: vi.fn().mockRejectedValue(new Error()),
      },
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: bookedCall });
    expect(incidents.notificationFailed).toHaveBeenCalledWith({
      recipient: "visitor",
    });
    expect(incidents.notificationFailed).toHaveBeenCalledWith({
      recipient: "coach",
    });
  });

  it("refuses a slot that is already taken, whoever holds it, without notifying anyone", async () => {
    // arrange
    const assessmentCallNotificationsPort = createNotifications();
    const assessmentCallReservationsPort = createReservations({
      findUpcomingCallFor: vi.fn().mockResolvedValue(existingCall()),
    });
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTimePort: createCoachTime({
        reserve: vi.fn().mockResolvedValue({ status: "taken" }),
      }),
      incidents: createIncidents(),
      assessmentCallNotificationsPort,
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
    expect(assessmentCallReservationsPort.add).not.toHaveBeenCalled();
    expect(assessmentCallNotificationsPort.notifyBooked).not.toHaveBeenCalled();
  });

  it("refuses a second upcoming call for one email without describing the first, giving back the time it held", async () => {
    // arrange
    const coachTimePort = createCoachTime();
    const assessmentCallReservationsPort = createReservations({
      findUpcomingCallFor: vi.fn().mockResolvedValue(existingCall()),
    });
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTimePort,
      incidents: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "email_already_booked" });
    expect(coachTimePort.release).toHaveBeenCalledWith(RESERVATION_ID);
    expect(assessmentCallReservationsPort.add).not.toHaveBeenCalled();
  });

  it("refuses a subaddressed email before reading the booking window, the availability or the reservations", async () => {
    // arrange
    const waitlistMode = { isEnabled: vi.fn().mockResolvedValue(false) };
    const coachAvailabilitySourcePort = createAvailabilitySource();
    const coachTimePort = createCoachTime();
    const assessmentCallNotificationsPort = createNotifications();
    const assessmentCallReservationsPort = createReservations();
    const bookAssessmentCallUseCase = new BookAssessmentCallUseCase({
      coachAvailabilityPort: availabilityOver(coachAvailabilitySourcePort),
      bookingWindow: createBookingWindow({ waitlistModePort: waitlistMode }),
      clockPort: clock,
      coachTimePort,
      emailAcceptancePort: createEmailAcceptance("refused"),
      assessmentCallIdsPort: callIds,
      assessmentCallIncidentsPort: createIncidents(),
      assessmentCallNotificationsPort,
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute({
      ...bookingCommand,
      email: "Ana+Coaching@Example.com",
    });

    // assert
    expect(result).toEqual({ status: "subaddress_refused" });
    expect(waitlistMode.isEnabled).not.toHaveBeenCalled();
    expect(coachAvailabilitySourcePort.current).not.toHaveBeenCalled();
    expect(coachTimePort.reserve).not.toHaveBeenCalled();
    expect(
      assessmentCallReservationsPort.lockVisitorEmail,
    ).not.toHaveBeenCalled();
    expect(assessmentCallNotificationsPort.notifyBooked).not.toHaveBeenCalled();
  });

  it("books a main address where subaddresses are refused", async () => {
    // arrange
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      emailSubaddresses: "refused",
      incidents: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const result = await bookAssessmentCallUseCase.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: bookedCall });
  });

  it("reserves a subaddressed email as entered where subaddresses are allowed", async () => {
    // arrange
    const assessmentCallReservationsPort = createReservations();
    const bookAssessmentCallUseCase = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      emailSubaddresses: "allowed",
      incidents: createIncidents(),
      assessmentCallNotificationsPort: createNotifications(),
      assessmentCallReservationsPort,
    });

    // act
    const result = await bookAssessmentCallUseCase.execute({
      ...bookingCommand,
      email: "Ana+Coaching@Example.com",
    });

    // assert
    expect(result).toEqual({
      status: "booked",
      call: expect.objectContaining({
        id: "call-new",
        visitorEmail: "ana+coaching@example.com",
      }),
    });
    expect(assessmentCallReservationsPort.add).toHaveBeenCalledWith(
      expect.objectContaining({
        call: expect.objectContaining({
          visitorEmail: "ana+coaching@example.com",
        }),
      }),
    );
  });
});

function createMeetingRoomSource(
  meetingRoomPort?: Partial<MeetingRoomPort>,
): MeetingRoomPort {
  return {
    current: vi.fn().mockResolvedValue(null),
    ...meetingRoomPort,
  };
}

describe("ResolveJoinLinkUseCase", () => {
  it("resolves the coach's current meeting room for a known booking", async () => {
    // arrange
    const call = existingCall();
    const meetingRoomPort = createMeetingRoomSource({
      current: vi
        .fn()
        .mockResolvedValue({ url: "https://meet.example.com/room" }),
    });
    const resolveJoinLinkUseCase = new ResolveJoinLinkUseCase({
      meetingRoomPort,
      assessmentCallReservationsPort: createReservations({
        findById: vi.fn().mockResolvedValue(call),
      }),
    });

    // act
    const result = await resolveJoinLinkUseCase.execute("call-1");

    // assert
    expect(result).toEqual({
      status: "found",
      url: "https://meet.example.com/room",
    });
  });

  it("reports the link as not set while the coach has saved no room", async () => {
    // arrange
    const resolveJoinLinkUseCase = new ResolveJoinLinkUseCase({
      meetingRoomPort: createMeetingRoomSource(),
      assessmentCallReservationsPort: createReservations({
        findById: vi.fn().mockResolvedValue(existingCall()),
      }),
    });

    // act
    const result = await resolveJoinLinkUseCase.execute("call-1");

    // assert
    expect(result).toEqual({ status: "link_not_set" });
  });

  it("reports an unknown booking without reading the meeting room", async () => {
    // arrange
    const meetingRoomPort = createMeetingRoomSource();
    const resolveJoinLinkUseCase = new ResolveJoinLinkUseCase({
      meetingRoomPort,
      assessmentCallReservationsPort: createReservations(),
    });

    // act
    const result = await resolveJoinLinkUseCase.execute("missing");

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(meetingRoomPort.current).not.toHaveBeenCalled();
  });
});
