import type { ClockPort } from "../clock-port";
import type { EmailAcceptancePort } from "../email-acceptance-port";

import { AssessmentCall, type ReservationDecision } from "./assessment-call";
import type { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallIdsPort } from "./assessment-call-ids-port";
import type { AssessmentCallIncidentsPort } from "./assessment-call-incidents-port";
import type { AssessmentCallNotificationsPort } from "./assessment-call-notifications-port";
import type { AssessmentCallReservationsPort } from "./assessment-call-reservations-port";
import type { CoachAvailabilityPort } from "./coach-availability-port";
import type { CoachTimePort } from "./coach-time-port";
import type { VisitorGender, VisitorPrimaryGoal } from "./visitor-profile";

export type BookAssessmentCallCommand = {
  startsAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
  notes: string | null;
  visitorTimeZone: string;
};

export type BookAssessmentCallResult =
  | { status: "booked"; call: AssessmentCall }
  | { status: "slot_unavailable" }
  | { status: "email_already_booked" }
  | { status: "subaddress_refused" }
  | { status: "closed" };

type BookAssessmentCallUseCaseOptions = {
  availability: CoachAvailabilityPort;
  bookingWindow: AssessmentCallBookingWindow;
  clock: ClockPort;
  coachTime: CoachTimePort;
  emailAcceptance: EmailAcceptancePort;
  ids: AssessmentCallIdsPort;
  incidents: AssessmentCallIncidentsPort;
  notifications: AssessmentCallNotificationsPort;
  reservations: AssessmentCallReservationsPort;
};

const RECIPIENTS = ["visitor", "coach"] as const;

export class BookAssessmentCallUseCase {
  constructor(private readonly options: BookAssessmentCallUseCaseOptions) {}

  async execute(
    command: BookAssessmentCallCommand,
  ): Promise<BookAssessmentCallResult> {
    const email = this.options.emailAcceptance.normalize(command.email);

    if (!this.options.emailAcceptance.accepts(email)) {
      return { status: "subaddress_refused" };
    }

    if (!(await this.options.bookingWindow.isOpen())) {
      return { status: "closed" };
    }

    const now = this.options.clock.now();
    const availability = await this.options.availability.current();

    if (!availability.offersStart({ start: command.startsAt, now })) {
      return { status: "slot_unavailable" };
    }

    const call = AssessmentCall.booked({
      id: this.options.ids.generate(),
      firstName: command.firstName,
      lastName: command.lastName,
      visitorEmail: email,
      visitorNotes: command.notes,
      dateOfBirth: command.dateOfBirth,
      gender: command.gender,
      primaryGoal: command.primaryGoal,
      country: command.country,
      phone: command.phone,
      startsAt: command.startsAt,
      visitorTimeZone: command.visitorTimeZone,
      coachTimeZone: availability.timeZone,
      at: now,
    });
    const reservation = await this.reserve(call, now);

    return this.resolveReservation(call, reservation);
  }

  private async reserve(
    call: AssessmentCall,
    now: Date,
  ): Promise<ReservationDecision> {
    const { coachTime, reservations } = this.options;

    await reservations.lockVisitorEmail(call.visitorEmail);

    const upcomingCallForEmail = await reservations.findUpcomingCallFor({
      visitorEmail: call.visitorEmail,
      now,
    });
    const held = await coachTime.reserve(call.coachTimeSpan());
    const decision = AssessmentCall.decideReservation({
      coachTime: held.status,
      upcomingCallForEmail,
    });

    if (held.status === "taken") {
      return decision;
    }

    if (decision.status === "reserved") {
      await reservations.add({ call, reservationId: held.reservationId });
    } else {
      await coachTime.release(held.reservationId);
    }

    return decision;
  }

  private async resolveReservation(
    call: AssessmentCall,
    reservation: ReservationDecision,
  ): Promise<BookAssessmentCallResult> {
    if (reservation.status === "email_has_upcoming_call") {
      return { status: "email_already_booked" };
    }

    if (reservation.status === "slot_taken") {
      return { status: "slot_unavailable" };
    }

    await this.notifyBooked(call);

    return { status: "booked", call };
  }

  private async notifyBooked(call: AssessmentCall): Promise<void> {
    try {
      const delivery = await this.options.notifications.notifyBooked(
        call.toSnapshot(),
      );

      for (const recipient of RECIPIENTS) {
        if (delivery[recipient] === "failed") {
          this.options.incidents.notificationFailed({ recipient });
        }
      }
    } catch {
      for (const recipient of RECIPIENTS) {
        this.options.incidents.notificationFailed({ recipient });
      }
    }
  }
}
