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
  coachAvailabilityPort: CoachAvailabilityPort;
  bookingWindow: AssessmentCallBookingWindow;
  clockPort: ClockPort;
  coachTimePort: CoachTimePort;
  emailAcceptancePort: EmailAcceptancePort;
  assessmentCallIdsPort: AssessmentCallIdsPort;
  assessmentCallIncidentsPort: AssessmentCallIncidentsPort;
  assessmentCallNotificationsPort: AssessmentCallNotificationsPort;
  assessmentCallReservationsPort: AssessmentCallReservationsPort;
};

const RECIPIENTS = ["visitor", "coach"] as const;

export class BookAssessmentCallUseCase {
  constructor(private readonly options: BookAssessmentCallUseCaseOptions) {}

  async execute(
    command: BookAssessmentCallCommand,
  ): Promise<BookAssessmentCallResult> {
    const email = this.options.emailAcceptancePort.normalize(command.email);

    if (!this.options.emailAcceptancePort.accepts(email)) {
      return { status: "subaddress_refused" };
    }

    if (!(await this.options.bookingWindow.isOpen())) {
      return { status: "closed" };
    }

    const now = this.options.clockPort.now();
    const availability = await this.options.coachAvailabilityPort.current();

    if (!availability.offersStart({ start: command.startsAt, now })) {
      return { status: "slot_unavailable" };
    }

    const call = AssessmentCall.booked({
      id: this.options.assessmentCallIdsPort.generate(),
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
    const { coachTimePort, assessmentCallReservationsPort } = this.options;

    await assessmentCallReservationsPort.lockVisitorEmail(call.visitorEmail);

    const upcomingCallForEmail =
      await assessmentCallReservationsPort.findUpcomingCallFor({
        visitorEmail: call.visitorEmail,
        now,
      });
    const held = await coachTimePort.reserve(call.coachTimeSpan());
    const decision = AssessmentCall.decideReservation({
      coachTime: held.status,
      upcomingCallForEmail,
    });

    if (held.status === "taken") {
      return decision;
    }

    if (decision.status === "reserved") {
      await assessmentCallReservationsPort.add({
        call,
        reservationId: held.reservationId,
      });
    } else {
      await coachTimePort.release(held.reservationId);
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
      const delivery =
        await this.options.assessmentCallNotificationsPort.notifyBooked(
          call.toSnapshot(),
        );

      for (const recipient of RECIPIENTS) {
        if (delivery[recipient] === "failed") {
          this.options.assessmentCallIncidentsPort.notificationFailed({
            recipient,
          });
        }
      }
    } catch {
      for (const recipient of RECIPIENTS) {
        this.options.assessmentCallIncidentsPort.notificationFailed({
          recipient,
        });
      }
    }
  }
}
