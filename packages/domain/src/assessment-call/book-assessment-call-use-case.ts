import type { CoachAvailabilitySource } from "../coach-availability";
import { EmailAddress } from "../email-address";
import type { Clock } from "../shared";

import type { AssessmentCall } from "./assessment-call";
import type { AssessmentCallBookingWindow } from "./assessment-call-booking-window";
import type { AssessmentCallIncidents } from "./assessment-call-incidents";
import type { AssessmentCallNotifications } from "./assessment-call-notifications";
import type {
  AssessmentCallReservations,
  ReservationResult,
} from "./assessment-call-reservations";
import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";
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
  | { status: "closed" };

type BookAssessmentCallUseCaseOptions = {
  availability: CoachAvailabilitySource;
  bookingWindow: AssessmentCallBookingWindow;
  clock: Clock;
  incidents: AssessmentCallIncidents;
  notifications: AssessmentCallNotifications;
  reservations: AssessmentCallReservations;
};

const RECIPIENTS = ["visitor", "coach"] as const;

export class BookAssessmentCallUseCase {
  constructor(private readonly options: BookAssessmentCallUseCaseOptions) {}

  async execute(
    command: BookAssessmentCallCommand,
  ): Promise<BookAssessmentCallResult> {
    if (!(await this.options.bookingWindow.isOpen())) {
      return { status: "closed" };
    }

    const normalizedEmail = EmailAddress.normalize(command.email).value;
    const now = this.options.clock.now();
    const availability = await this.options.availability.current();

    const offered = availability.isOpenStart({
      start: command.startsAt,
      now,
      policy: ASSESSMENT_CALL_RULES,
    });

    if (!offered) {
      return { status: "slot_unavailable" };
    }

    const reservation = await this.options.reservations.reserve({
      bookedAt: now,
      coachTimeZone: availability.timeZone,
      country: command.country,
      dateOfBirth: command.dateOfBirth,
      firstName: command.firstName,
      gender: command.gender,
      lastName: command.lastName,
      normalizedEmail,
      notes: command.notes,
      now,
      phone: command.phone,
      primaryGoal: command.primaryGoal,
      startsAt: command.startsAt,
      visitorTimeZone: command.visitorTimeZone,
    });

    return this.resolveReservation(reservation);
  }

  private async resolveReservation(
    reservation: ReservationResult,
  ): Promise<BookAssessmentCallResult> {
    if (reservation.status === "email_has_upcoming_call") {
      return { status: "email_already_booked" };
    }

    if (reservation.status === "slot_taken") {
      return { status: "slot_unavailable" };
    }

    await this.notifyBooked(reservation.call);

    return { status: "booked", call: reservation.call };
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
