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
type CoachAvailabilitySource = OpeningsSources["availability"];
type CoachCalendar = OpeningsSources["calendar"];
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
  waitlistMode: WaitlistModePort;
  incidents?: ReturnType<typeof createIncidents>;
}): AssessmentCallBookingWindow {
  return new AssessmentCallBookingWindow({
    incidents: options.incidents ?? createIncidents(),
    waitlistMode: options.waitlistMode,
  });
}

function openBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    waitlistMode: { isEnabled: vi.fn().mockResolvedValue(false) },
  });
}

function closedBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    waitlistMode: { isEnabled: vi.fn().mockResolvedValue(true) },
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
  options?: Partial<AssessmentCallReservationsPort>,
): AssessmentCallReservationsPort {
  return {
    lockVisitorEmail: vi.fn().mockResolvedValue(undefined),
    findUpcomingCallFor: vi.fn().mockResolvedValue(null),
    add: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    listAll: vi.fn().mockResolvedValue([]),
    ...options,
  };
}

function createCoachTime(options?: Partial<CoachTimePort>): CoachTimePort {
  return {
    reserve: vi
      .fn()
      .mockResolvedValue({ status: "reserved", reservationId: RESERVATION_ID }),
    release: vi.fn().mockResolvedValue(undefined),
    ...options,
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
    openings: new CoachOpenings({ availability, calendar }),
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
    availability: availabilityOver(options.availability, options.calendar),
    bookingWindow: openBookingWindow(),
    clock,
    incidents: options.incidents,
  });
}

function createBookAssessmentCall(options: {
  availability: CoachAvailabilitySource;
  coachTime?: CoachTimePort;
  emailSubaddresses?: EmailSubaddressPolicy;
  incidents: ReturnType<typeof createIncidents>;
  notifications: AssessmentCallNotificationsPort;
  reservations: AssessmentCallReservationsPort;
}): BookAssessmentCallUseCase {
  return new BookAssessmentCallUseCase({
    availability: availabilityOver(options.availability),
    bookingWindow: openBookingWindow(),
    clock,
    coachTime: options.coachTime ?? createCoachTime(),
    emailAcceptance: createEmailAcceptance(
      options.emailSubaddresses ?? "allowed",
    ),
    ids: callIds,
    incidents: options.incidents,
    notifications: options.notifications,
    reservations: options.reservations,
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
      waitlistMode: { isEnabled: vi.fn().mockRejectedValue(new Error("down")) },
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
    const availability = createAvailabilitySource();
    const calendar = createCalendar();
    const listOpenSlots = new ListOpenSlotsUseCase({
      availability: availabilityOver(availability, calendar),
      bookingWindow: closedBookingWindow(),
      clock,
      incidents: createIncidents(),
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(availability.current).not.toHaveBeenCalled();
    expect(calendar.busyFrom).not.toHaveBeenCalled();
  });

  it("offers the coach time zone and the starts the coach's busy time leaves free", async () => {
    // arrange
    const calendar = createCalendar({
      busyFrom: vi.fn().mockResolvedValue([
        {
          start: new Date("2026-06-01T15:15:00.000Z"),
          end: new Date("2026-06-01T15:45:00.000Z"),
        },
      ]),
    });
    const listOpenSlots = createListOpenSlots({
      availability: createAvailabilitySource(),
      calendar,
      incidents: createIncidents(),
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(calendar.busyFrom).toHaveBeenCalledWith(NOW);
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
    const listOpenSlots = createListOpenSlots({
      availability: { current: vi.fn().mockRejectedValue(new Error("down")) },
      calendar: createCalendar(),
      incidents,
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.slotsReadFailed).toHaveBeenCalledOnce();
  });

  it("lets a fault in the slot arithmetic surface instead of reporting empty", async () => {
    // arrange
    const incidents = createIncidents();
    const availability = createAvailabilitySource();
    const configured = await availability.current();
    vi.spyOn(configured, "openSlotStarts").mockImplementation(() => {
      throw new RangeError("Invalid time zone specified: Europe/Bucarest");
    });
    const listOpenSlots = createListOpenSlots({
      availability,
      calendar: createCalendar(),
      incidents,
    });

    // act
    const execute = listOpenSlots.execute();

    // assert
    await expect(execute).rejects.toThrow(/Invalid time zone/);
    expect(incidents.slotsReadFailed).not.toHaveBeenCalled();
  });

  it("reports unavailable and logs when the coach calendar throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listOpenSlots = createListOpenSlots({
      availability: createAvailabilitySource(),
      calendar: createCalendar({
        busyFrom: vi.fn().mockRejectedValue(new Error("down")),
      }),
      incidents,
    });

    // act
    const result = await listOpenSlots.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(incidents.slotsReadFailed).toHaveBeenCalledOnce();
  });
});

describe("ListAssessmentCallsUseCase", () => {
  it("lists the coach's calls as snapshots carrying their end, in her time zone", async () => {
    // arrange
    const call = existingCall();
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: availabilityOver(
        createAvailabilitySource("Europe/Chisinau"),
      ),
      incidents: createIncidents(),
      reservations: createReservations({
        listAll: vi.fn().mockResolvedValue([call]),
      }),
    });

    // act
    const listing = loadedListing(await listAssessmentCalls.execute());

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
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: availabilityOver(createAvailabilitySource()),
      incidents: createIncidents(),
      reservations: createReservations({
        listAll: vi.fn().mockResolvedValue([earlier, later]),
      }),
    });

    // act
    const listing = loadedListing(await listAssessmentCalls.execute());

    // assert
    expect(listing.calls.map((call) => call.id)).toEqual(["call-1", "call-2"]);
  });

  it("still names the coach's time zone when she has no calls", async () => {
    // arrange
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: availabilityOver(createAvailabilitySource()),
      incidents: createIncidents(),
      reservations: createReservations(),
    });

    // act
    const listing = await listAssessmentCalls.execute();

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
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: availabilityOver(createAvailabilitySource()),
      incidents,
      reservations: createReservations({
        listAll: vi.fn().mockRejectedValue(new Error("down")),
      }),
    });

    // act
    const listing = await listAssessmentCalls.execute();

    // assert
    expect(listing).toEqual({ status: "unavailable" });
    expect(incidents.callsReadFailed).toHaveBeenCalledOnce();
  });

  it("reports unavailable and logs when the availability read throws", async () => {
    // arrange
    const incidents = createIncidents();
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: availabilityOver({
        current: vi.fn().mockRejectedValue(new Error("down")),
      }),
      incidents,
      reservations: createReservations(),
    });

    // act
    const listing = await listAssessmentCalls.execute();

    // assert
    expect(listing).toEqual({ status: "unavailable" });
    expect(incidents.callsReadFailed).toHaveBeenCalledOnce();
  });
});

describe("BookAssessmentCallUseCase", () => {
  it("reports closed without reserving when booking is closed", async () => {
    // arrange
    const reservations = createReservations();
    const coachTime = createCoachTime();
    const bookAssessmentCall = new BookAssessmentCallUseCase({
      availability: availabilityOver(createAvailabilitySource()),
      bookingWindow: closedBookingWindow(),
      clock,
      coachTime,
      emailAcceptance: createEmailAcceptance("allowed"),
      ids: callIds,
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(coachTime.reserve).not.toHaveBeenCalled();
    expect(reservations.add).not.toHaveBeenCalled();
  });

  it("refuses a start the availability no longer offers", async () => {
    // arrange
    const reservations = createReservations();
    const coachTime = createCoachTime();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTime,
      incidents: createIncidents(),
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
    expect(coachTime.reserve).not.toHaveBeenCalled();
    expect(reservations.add).not.toHaveBeenCalled();
  });

  it("reserves a call under a fresh id with the visitor's profile, the normalised email and the clock instants, then notifies", async () => {
    // arrange
    const reservations = createReservations();
    const notifications = createNotifications();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents: createIncidents(),
      notifications,
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(reservations.lockVisitorEmail).toHaveBeenCalledWith(
      "ana@example.com",
    );
    expect(reservations.findUpcomingCallFor).toHaveBeenCalledWith({
      visitorEmail: "ana@example.com",
      now: NOW,
    });
    expect(reservations.add).toHaveBeenCalledWith({
      call: bookedCall,
      reservationId: RESERVATION_ID,
    });
    expect(notifications.notifyBooked).toHaveBeenCalledWith(
      bookedCall.toSnapshot(),
    );
    expect(result).toEqual({ status: "booked", call: bookedCall });
  });

  it("reserves with the time zone the availability source carries", async () => {
    // arrange
    const reservations = createReservations();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource("Europe/Chisinau"),
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(reservations.add).toHaveBeenCalledWith(
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
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents,
      notifications: createNotifications(delivery),
      reservations: createReservations(),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: bookedCall });
    expect(incidents.notificationFailed).toHaveBeenCalledTimes(failures);
  });

  it("keeps the booking when the notification port throws", async () => {
    // arrange
    const incidents = createIncidents();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents,
      notifications: { notifyBooked: vi.fn().mockRejectedValue(new Error()) },
      reservations: createReservations(),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

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
    const notifications = createNotifications();
    const reservations = createReservations({
      findUpcomingCallFor: vi.fn().mockResolvedValue(existingCall()),
    });
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTime: createCoachTime({
        reserve: vi.fn().mockResolvedValue({ status: "taken" }),
      }),
      incidents: createIncidents(),
      notifications,
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
    expect(reservations.add).not.toHaveBeenCalled();
    expect(notifications.notifyBooked).not.toHaveBeenCalled();
  });

  it("refuses a second upcoming call for one email without describing the first, giving back the time it held", async () => {
    // arrange
    const coachTime = createCoachTime();
    const reservations = createReservations({
      findUpcomingCallFor: vi.fn().mockResolvedValue(existingCall()),
    });
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      coachTime,
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "email_already_booked" });
    expect(coachTime.release).toHaveBeenCalledWith(RESERVATION_ID);
    expect(reservations.add).not.toHaveBeenCalled();
  });

  it("refuses a subaddressed email before reading the booking window, the availability or the reservations", async () => {
    // arrange
    const waitlistMode = { isEnabled: vi.fn().mockResolvedValue(false) };
    const availability = createAvailabilitySource();
    const coachTime = createCoachTime();
    const notifications = createNotifications();
    const reservations = createReservations();
    const bookAssessmentCall = new BookAssessmentCallUseCase({
      availability: availabilityOver(availability),
      bookingWindow: createBookingWindow({ waitlistMode }),
      clock,
      coachTime,
      emailAcceptance: createEmailAcceptance("refused"),
      ids: callIds,
      incidents: createIncidents(),
      notifications,
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute({
      ...bookingCommand,
      email: "Ana+Coaching@Example.com",
    });

    // assert
    expect(result).toEqual({ status: "subaddress_refused" });
    expect(waitlistMode.isEnabled).not.toHaveBeenCalled();
    expect(availability.current).not.toHaveBeenCalled();
    expect(coachTime.reserve).not.toHaveBeenCalled();
    expect(reservations.lockVisitorEmail).not.toHaveBeenCalled();
    expect(notifications.notifyBooked).not.toHaveBeenCalled();
  });

  it("books a main address where subaddresses are refused", async () => {
    // arrange
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      emailSubaddresses: "refused",
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations: createReservations(),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "booked", call: bookedCall });
  });

  it("reserves a subaddressed email as entered where subaddresses are allowed", async () => {
    // arrange
    const reservations = createReservations();
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      emailSubaddresses: "allowed",
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations,
    });

    // act
    const result = await bookAssessmentCall.execute({
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
    expect(reservations.add).toHaveBeenCalledWith(
      expect.objectContaining({
        call: expect.objectContaining({
          visitorEmail: "ana+coaching@example.com",
        }),
      }),
    );
  });
});

function createMeetingRoomSource(
  options?: Partial<MeetingRoomPort>,
): MeetingRoomPort {
  return {
    current: vi.fn().mockResolvedValue(null),
    ...options,
  };
}

describe("ResolveJoinLinkUseCase", () => {
  it("resolves the coach's current meeting room for a known booking", async () => {
    // arrange
    const call = existingCall();
    const meetingRoom = createMeetingRoomSource({
      current: vi
        .fn()
        .mockResolvedValue({ url: "https://meet.example.com/room" }),
    });
    const resolveJoinLink = new ResolveJoinLinkUseCase({
      meetingRoom,
      reservations: createReservations({
        findById: vi.fn().mockResolvedValue(call),
      }),
    });

    // act
    const result = await resolveJoinLink.execute("call-1");

    // assert
    expect(result).toEqual({
      status: "found",
      url: "https://meet.example.com/room",
    });
  });

  it("reports the link as not set while the coach has saved no room", async () => {
    // arrange
    const resolveJoinLink = new ResolveJoinLinkUseCase({
      meetingRoom: createMeetingRoomSource(),
      reservations: createReservations({
        findById: vi.fn().mockResolvedValue(existingCall()),
      }),
    });

    // act
    const result = await resolveJoinLink.execute("call-1");

    // assert
    expect(result).toEqual({ status: "link_not_set" });
  });

  it("reports an unknown booking without reading the meeting room", async () => {
    // arrange
    const meetingRoom = createMeetingRoomSource();
    const resolveJoinLink = new ResolveJoinLinkUseCase({
      meetingRoom,
      reservations: createReservations(),
    });

    // act
    const result = await resolveJoinLink.execute("missing");

    // assert
    expect(result).toEqual({ status: "unknown" });
    expect(meetingRoom.current).not.toHaveBeenCalled();
  });
});
