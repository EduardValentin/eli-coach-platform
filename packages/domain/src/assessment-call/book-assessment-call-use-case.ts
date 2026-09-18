import type { CoachAvailabilitySource } from "../coach-availability";
import { EmailAddress } from "../email-address";
import type { Clock, Logger } from "../shared";

import type { AssessmentCall } from "./assessment-call";
import type {
  AssessmentCallNotifications,
  AssessmentCallRecipient,
} from "./assessment-call-notifications";
import type {
  AssessmentCallReservations,
  ReservationResult,
} from "./assessment-call-reservations";

export type BookAssessmentCallCommand = {
  startsAt: Date;
  fullName: string;
  email: string;
  notes: string | null;
  visitorTimeZone: string;
};

export type BookAssessmentCallResult =
  | { status: "booked"; call: AssessmentCall }
  | { status: "slot_unavailable" }
  | { status: "email_already_booked"; existing: AssessmentCall }
  | { status: "closed" };

type BookAssessmentCallUseCaseOptions = {
  availability: CoachAvailabilitySource;
  bookingOpen: boolean;
  clock: Clock;
  coachTimeZone: string;
  logger: Logger;
  notifications: AssessmentCallNotifications;
  reservations: AssessmentCallReservations;
};

const RECIPIENTS = ["visitor", "coach"] as const;

export class BookAssessmentCallUseCase {
  constructor(private readonly options: BookAssessmentCallUseCaseOptions) {}

  async execute(
    command: BookAssessmentCallCommand,
  ): Promise<BookAssessmentCallResult> {
    if (!this.options.bookingOpen) {
      return { status: "closed" };
    }

    const normalizedEmail = EmailAddress.normalize(command.email).value;
    const now = this.options.clock.now();
    const availability = await this.options.availability.current();

    if (!availability.isOpenStart({ start: command.startsAt, now })) {
      return { status: "slot_unavailable" };
    }

    const reservation = await this.options.reservations.reserve({
      bookedAt: now,
      coachTimeZone: this.options.coachTimeZone,
      fullName: command.fullName,
      normalizedEmail,
      notes: command.notes,
      now,
      startsAt: command.startsAt,
      visitorTimeZone: command.visitorTimeZone,
    });

    return this.resolveReservation(reservation, normalizedEmail);
  }

  private async resolveReservation(
    reservation: ReservationResult,
    normalizedEmail: string,
  ): Promise<BookAssessmentCallResult> {
    if (reservation.status === "email_has_upcoming_call") {
      return { status: "email_already_booked", existing: reservation.existing };
    }

    if (reservation.status === "slot_taken") {
      return reservation.existing.isHeldBy(normalizedEmail)
        ? { status: "booked", call: reservation.existing }
        : { status: "slot_unavailable" };
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
          this.logNotificationFailure(recipient);
        }
      }
    } catch {
      for (const recipient of RECIPIENTS) {
        this.logNotificationFailure(recipient);
      }
    }
  }

  private logNotificationFailure(recipient: AssessmentCallRecipient): void {
    this.options.logger.error("Assessment call notification failed.", {
      errorCategory: "assessment_call_notification_failure",
      recipient,
    });
  }
}
