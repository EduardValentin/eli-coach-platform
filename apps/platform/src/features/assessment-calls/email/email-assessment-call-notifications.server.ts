import { joinBasePath } from "@eli-coach-platform/config";
import type {
  AssessmentCallNotificationResult,
  AssessmentCallNotifications,
  AssessmentCallSnapshot,
} from "@eli-coach-platform/domain/assessment-call";
import type {
  EmailAttachment,
  ProductEmail,
  ProductEmailCommand,
} from "@eli-coach-platform/domain/shared";

import { assessmentCallJoinPath } from "~/features/assessment-calls/contracts/paths";

import { buildGoogleCalendarUrl, buildIcs } from "./calendar-invite.server";
import { createCoachNotificationEmailContent } from "./coach-notification-email.server";
import { createVisitorConfirmationEmailContent } from "./visitor-confirmation-email.server";

export type EmailAssessmentCallNotificationsOptions = {
  appBasePath: string;
  coachEmail: string;
  contactEmail: string;
  publicAppUrl: string;
};

type Delivery = AssessmentCallNotificationResult["visitor"];

const INVITE_CONTENT_TYPE = "text/calendar; charset=utf-8; method=PUBLISH";
const INVITE_FILENAME = "invite.ics";

export class EmailAssessmentCallNotifications implements AssessmentCallNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailAssessmentCallNotificationsOptions,
  ) {}

  async notifyBooked(
    call: AssessmentCallSnapshot,
  ): Promise<AssessmentCallNotificationResult> {
    const joinUrl = this.buildJoinUrl(call.id);
    const invite: EmailAttachment = {
      content: buildIcs(call, {
        joinUrl,
        organizerEmail: this.options.contactEmail,
        uidHost: this.uidHost(),
      }),
      contentType: INVITE_CONTENT_TYPE,
      filename: INVITE_FILENAME,
    };
    const visitorContent = createVisitorConfirmationEmailContent({
      call,
      contactEmail: this.options.contactEmail,
      googleCalendarUrl: buildGoogleCalendarUrl(call, {
        joinUrl,
        timeZone: call.visitorTimeZone,
      }),
      joinUrl,
    });
    const coachContent = createCoachNotificationEmailContent({
      call,
      googleCalendarUrl: buildGoogleCalendarUrl(call, {
        joinUrl,
        timeZone: call.coachTimeZone,
      }),
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
        subject: coachContent.subject,
        text: coachContent.text,
        to: this.options.coachEmail,
      }),
    ]);

    return { coach: toDelivery(coach), visitor: toDelivery(visitor) };
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
