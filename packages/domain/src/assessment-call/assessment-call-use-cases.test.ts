import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilitySource,
  type CoachCalendar,
} from "../coach-availability";
import type { FeatureFlagReader } from "../feature-flag";

import { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallNotifications } from "./assessment-call-notifications";
import type { AssessmentCallReservations } from "./assessment-call-reservations";
import { AssessmentCall } from "./assessment-call";
import { BookAssessmentCallUseCase } from "./book-assessment-call-use-case";
import { ListAssessmentCallsUseCase } from "./list-assessment-calls-use-case";
import { ListOpenSlotsUseCase } from "./list-open-slots-use-case";
import type { MeetingRoomLink } from "./meeting-room-link";
import { ResolveJoinLinkUseCase } from "./resolve-join-link-use-case";

const NOW = new Date("2026-06-01T06:00:00.000Z");
const OPEN_START = new Date("2026-06-01T15:00:00.000Z");
const CLOSED_START = new Date("2026-06-01T13:00:00.000Z");
const COACH_TIME_ZONE = "Europe/Bucharest";

const clock = { now: () => NOW };

function createIncidents() {
  return {
    bookingModeReadFailed: vi.fn(),
    notificationFailed: vi.fn(),
    slotsReadFailed: vi.fn(),
  };
}

function createBookingWindow(options: {
  featureFlags: FeatureFlagReader;
  incidents?: ReturnType<typeof createIncidents>;
}): AssessmentCallBookingWindow {
  return new AssessmentCallBookingWindow({
    featureFlags: options.featureFlags,
    incidents: options.incidents ?? createIncidents(),
  });
}

function openBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    featureFlags: {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: false }),
    },
  });
}

function closedBookingWindow(): AssessmentCallBookingWindow {
  return createBookingWindow({
    featureFlags: {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    },
  });
}

function createAvailabilitySource(
  timeZone: string = COACH_TIME_ZONE,
): CoachAvailabilitySource {
  return {
    current: vi.fn().mockResolvedValue(
      CoachAvailability.configure({
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
    visitorName: "Ana Popescu",
    visitorEmail: props?.visitorEmail ?? "ana@example.com",
    visitorNotes: null,
    startsAt: props?.startsAt ?? OPEN_START,
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
    findById: vi.fn().mockResolvedValue(null),
    listAll: vi.fn().mockResolvedValue([]),
    ...options,
  };
}

function createCalendar(options?: Partial<CoachCalendar>): CoachCalendar {
  return {
    busyFrom: vi.fn().mockResolvedValue([]),
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
  calendar: CoachCalendar;
  incidents: ReturnType<typeof createIncidents>;
}): ListOpenSlotsUseCase {
  return new ListOpenSlotsUseCase({
    availability: options.availability,
    bookingWindow: openBookingWindow(),
    calendar: options.calendar,
    clock,
    incidents: options.incidents,
  });
}

function createBookAssessmentCall(options: {
  availability: CoachAvailabilitySource;
  incidents: ReturnType<typeof createIncidents>;
  notifications: AssessmentCallNotifications;
  reservations: AssessmentCallReservations;
}): BookAssessmentCallUseCase {
  return new BookAssessmentCallUseCase({
    availability: options.availability,
    bookingWindow: openBookingWindow(),
    clock,
    incidents: options.incidents,
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

  it("opens when no waitlist mode is persisted", async () => {
    // arrange
    const bookingWindow = createBookingWindow({
      featureFlags: { execute: vi.fn().mockResolvedValue({}) },
    });

    // act
    const open = await bookingWindow.isOpen();

    // assert
    expect(open).toBe(true);
  });

  it("stays closed and records the incident when the mode cannot be read", async () => {
    // arrange
    const incidents = createIncidents();
    const bookingWindow = createBookingWindow({
      featureFlags: { execute: vi.fn().mockRejectedValue(new Error("down")) },
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
      availability,
      bookingWindow: closedBookingWindow(),
      calendar,
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
      availability: createAvailabilitySource("Europe/Chisinau"),
      reservations: createReservations({
        listAll: vi.fn().mockResolvedValue([call]),
      }),
    });

    // act
    const listing = await listAssessmentCalls.execute();

    // assert
    expect(listing).toEqual({
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
      availability: createAvailabilitySource(),
      reservations: createReservations({
        listAll: vi.fn().mockResolvedValue([earlier, later]),
      }),
    });

    // act
    const listing = await listAssessmentCalls.execute();

    // assert
    expect(listing.calls.map((call) => call.id)).toEqual(["call-1", "call-2"]);
  });

  it("still names the coach's time zone when she has no calls", async () => {
    // arrange
    const listAssessmentCalls = new ListAssessmentCallsUseCase({
      availability: createAvailabilitySource(),
      reservations: createReservations(),
    });

    // act
    const listing = await listAssessmentCalls.execute();

    // assert
    expect(listing).toEqual({ coachTimeZone: COACH_TIME_ZONE, calls: [] });
  });
});

describe("BookAssessmentCallUseCase", () => {
  it("reports closed without reserving when booking is closed", async () => {
    // arrange
    const reservations = createReservations();
    const bookAssessmentCall = new BookAssessmentCallUseCase({
      availability: createAvailabilitySource(),
      bookingWindow: closedBookingWindow(),
      clock,
      incidents: createIncidents(),
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
    expect(reservations.reserve).not.toHaveBeenCalled();
  });

  it("reserves with the normalised email and the clock instants, then notifies", async () => {
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
    expect(reservations.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ coachTimeZone: "Europe/Chisinau" }),
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
    expect(result).toEqual({ status: "booked", call: existingCall() });
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
    expect(result).toEqual({ status: "booked", call: existingCall() });
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
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents: createIncidents(),
      notifications,
      reservations: createReservations({
        reserve: vi.fn().mockResolvedValue({ status: "slot_taken" }),
      }),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "slot_unavailable" });
    expect(notifications.notifyBooked).not.toHaveBeenCalled();
  });

  it("refuses a second upcoming call for one email without describing the first", async () => {
    // arrange
    const bookAssessmentCall = createBookAssessmentCall({
      availability: createAvailabilitySource(),
      incidents: createIncidents(),
      notifications: createNotifications(),
      reservations: createReservations({
        reserve: vi
          .fn()
          .mockResolvedValue({ status: "email_has_upcoming_call" }),
      }),
    });

    // act
    const result = await bookAssessmentCall.execute(bookingCommand);

    // assert
    expect(result).toEqual({ status: "email_already_booked" });
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
