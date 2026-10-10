import { joinBasePath } from "@eli-coach-platform/config";
import type {
  AssessmentCallNotificationResult,
  AssessmentCallNotifications,
  AssessmentCallSnapshot,
} from "@eli-coach-platform/domain/assessment-call";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/assessment-call";
import type {
  CalendarEvent,
  ProductEmail,
  ProductEmailCommand,
} from "@eli-coach-platform/infrastructure/email/server";
import {
  buildCalendarInvite,
  buildGoogleCalendarUrl,
} from "@eli-coach-platform/infrastructure/email/server";

import { assessmentCallJoinPath } from "~/features/assessment-calls/public/paths";

import { createCoachNotificationEmailContent } from "./coach-notification-email.server";
import { createVisitorConfirmationEmailContent } from "./visitor-confirmation-email.server";

export type EmailAssessmentCallNotificationsOptions = {
  appBasePath: string;
  coachEmail: string;
  contactEmail: string;
  publicAppUrl: string;
};

type Delivery = AssessmentCallNotificationResult["visitor"];

const CALENDAR_TITLE = "Free assessment call with Eli";
const INVITE_PRODUCT_NAME = "Assessment Call";

export class EmailAssessmentCallNotifications implements AssessmentCallNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailAssessmentCallNotificationsOptions,
  ) {}

  async notifyBooked(
    call: AssessmentCallSnapshot,
  ): Promise<AssessmentCallNotificationResult> {
    const joinUrl = this.buildJoinUrl(call.id);
    const event = this.toCalendarEvent(call, joinUrl);
    const invite = buildCalendarInvite(event, {
      issuedAt: call.bookedAt,
      organizerEmail: this.options.contactEmail,
      productName: INVITE_PRODUCT_NAME,
      uidHost: this.uidHost(),
    });
    const visitorContent = createVisitorConfirmationEmailContent({
      call,
      contactEmail: this.options.contactEmail,
      googleCalendarUrl: buildGoogleCalendarUrl(event, call.visitorTimeZone),
      joinUrl,
    });
    const coachContent = createCoachNotificationEmailContent({
      call,
      googleCalendarUrl: buildGoogleCalendarUrl(event, call.coachTimeZone),
      joinUrl,
    });
    const [visitor, coach] = await Promise.allSettled([
      this.send({
        attachments: [invite],
        html: visitorContent.html,
        idempotencyKey: `assessment-call:${call.id}:visitor`,
        subject: visitorContent.subject,
        text: visitorContent.text,
        to: call.visitorEmail,
      }),
      this.send({
        attachments: [invite],
        html: coachContent.html,
        idempotencyKey: `assessment-call:${call.id}:coach`,
        replyTo: call.visitorEmail,
        subject: coachContent.subject,
        text: coachContent.text,
        to: this.options.coachEmail,
      }),
    ]);

    return { coach: toDelivery(coach), visitor: toDelivery(visitor) };
  }

  private toCalendarEvent(
    call: AssessmentCallSnapshot,
    joinUrl: string,
  ): CalendarEvent {
    return {
      description: [
        `A free ${ASSESSMENT_CALL_RULES.durationMinutes}-minute assessment call with Eli.`,
        `Booked by: ${call.fullName}`,
        `Join the call: ${joinUrl}`,
      ].join("\n"),
      endsAt: call.endsAt,
      id: call.id,
      joinUrl,
      startsAt: call.startsAt,
      title: CALENDAR_TITLE,
    };
  }

  private async send(command: ProductEmailCommand): Promise<Delivery> {
    const delivery = await this.productEmail.send(command);

    return delivery.kind === "sent" ? "sent" : "failed";
  }

  private buildJoinUrl(bookingId: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, assessmentCallJoinPath(bookingId)),
      this.options.publicAppUrl,
    ).toString();
  }

  private uidHost(): string {
    return new URL(this.options.publicAppUrl).host;
  }
}

function toDelivery(settled: PromiseSettledResult<Delivery>): Delivery {
  return settled.status === "fulfilled" ? settled.value : "failed";
}
