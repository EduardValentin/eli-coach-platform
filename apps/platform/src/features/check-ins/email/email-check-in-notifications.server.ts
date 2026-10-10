import { joinBasePath } from "@eli-coach-platform/config";
import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";
import {
  CHECK_IN_RULES,
  type CheckInClientIdentity,
  type CheckInDelivery,
  type CheckInNotice,
  type CheckInNotification,
  type CheckInNotifications,
} from "@eli-coach-platform/domain/check-in";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  buildCalendarInvite,
  buildGoogleCalendarUrl,
  type CalendarEvent,
  type EmailAttachment,
  type ProductEmail,
} from "@eli-coach-platform/infrastructure/email/server";
import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { formatCallMoment } from "~/features/assessment-calls/public/call-moment";
import {
  CLIENT_CHECK_INS_PATH,
  clientCheckInJoinPath,
  COACH_CHECK_INS_PATH,
} from "~/features/check-ins/public/paths";

import {
  CheckInApprovedEmail,
  checkInApprovedSubject,
  checkInApprovedText,
} from "./check-in-approved-email.server";
import {
  CheckInDeclinedEmail,
  checkInDeclinedSubject,
  checkInDeclinedText,
} from "./check-in-declined-email.server";
import {
  CheckInRequestedEmail,
  checkInRequestedSubject,
  checkInRequestedText,
} from "./check-in-requested-email.server";
import {
  CheckInWithdrawnEmail,
  checkInWithdrawnSubject,
  checkInWithdrawnText,
} from "./check-in-withdrawn-email.server";

type EmailCheckInNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  coachEmail: string;
  contactEmail: string;
  publicAppUrl: string;
};

type CheckInEmail = {
  checkInId: string;
  notification: CheckInNotification;
  to: string;
  replyTo?: string;
  attachments?: readonly EmailAttachment[];
  subject: string;
  text: string;
  body: ReactElement;
};

const CALENDAR_TITLE = `Check-in with ${COACH_DISPLAY_NAME}`;
const INVITE_PRODUCT_NAME = "Check-in";
const NAME_UNSAFE_RUNS = /[\p{Cc}\s]+/gu;

export class EmailCheckInNotifications implements CheckInNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailCheckInNotificationsOptions,
  ) {}

  requested(notice: CheckInNotice): Promise<CheckInDelivery> {
    const props = {
      clientName: this.fullNameOf(notice.client),
      note: notice.checkIn.note,
      when: formatCallMoment(
        notice.checkIn.startsAt,
        notice.checkIn.coachTimeZone,
      ),
      reviewUrl: this.publicUrlOf(COACH_CHECK_INS_PATH),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "requested",
      to: this.options.coachEmail,
      replyTo: notice.client.email,
      subject: checkInRequestedSubject(props),
      text: checkInRequestedText(props),
      body: createElement(CheckInRequestedEmail, props),
    });
  }

  withdrawn(notice: CheckInNotice): Promise<CheckInDelivery> {
    const props = {
      clientName: this.fullNameOf(notice.client),
      when: formatCallMoment(
        notice.checkIn.startsAt,
        notice.checkIn.coachTimeZone,
      ),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "withdrawn",
      to: this.options.coachEmail,
      replyTo: notice.client.email,
      subject: checkInWithdrawnSubject(props),
      text: checkInWithdrawnText(props),
      body: createElement(CheckInWithdrawnEmail, props),
    });
  }

  approved(notice: CheckInNotice): Promise<CheckInDelivery> {
    const joinUrl = this.publicUrlOf(clientCheckInJoinPath(notice.checkIn.id));
    const event = this.toCalendarEvent(notice.checkIn, joinUrl);
    const props = {
      when: formatCallMoment(
        notice.checkIn.startsAt,
        notice.checkIn.clientTimeZone,
      ),
      joinUrl,
      googleCalendarUrl: buildGoogleCalendarUrl(
        event,
        notice.checkIn.clientTimeZone,
      ),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "approved",
      to: notice.client.email,
      attachments: [this.inviteFor(event)],
      subject: checkInApprovedSubject(),
      text: checkInApprovedText(props),
      body: createElement(CheckInApprovedEmail, props),
    });
  }

  declined(notice: CheckInNotice): Promise<CheckInDelivery> {
    const props = {
      when: formatCallMoment(
        notice.checkIn.startsAt,
        notice.checkIn.clientTimeZone,
      ),
      checkInsUrl: this.publicUrlOf(CLIENT_CHECK_INS_PATH),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "declined",
      to: notice.client.email,
      subject: checkInDeclinedSubject(),
      text: checkInDeclinedText(props),
      body: createElement(CheckInDeclinedEmail, props),
    });
  }

  private async send(email: CheckInEmail): Promise<CheckInDelivery> {
    const delivery = await this.productEmail.send({
      html: `<!doctype html>${renderToStaticMarkup(email.body)}`,
      idempotencyKey: `check-in:${email.checkInId}:${email.notification}`,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      ...(email.attachments ? { attachments: email.attachments } : {}),
      subject: email.subject,
      text: email.text,
      to: email.to,
    });

    return delivery.kind === "sent" ? "sent" : "failed";
  }

  private inviteFor(event: CalendarEvent): EmailAttachment {
    return buildCalendarInvite(event, {
      issuedAt: this.options.clock.now(),
      organizerEmail: this.options.contactEmail,
      productName: INVITE_PRODUCT_NAME,
      uidHost: new URL(this.options.publicAppUrl).host,
    });
  }

  private publicUrlOf(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }

  private currentYear(): number {
    return this.options.clock.now().getUTCFullYear();
  }

  private toCalendarEvent(
    checkIn: CheckInNotice["checkIn"],
    joinUrl: string,
  ): CalendarEvent {
    return {
      description: [
        `A ${CHECK_IN_RULES.durationMinutes}-minute check-in with ${COACH_DISPLAY_NAME}.`,
        `Join the check-in: ${joinUrl}`,
      ].join("\n"),
      endsAt: checkIn.endsAt,
      id: checkIn.id,
      joinUrl,
      startsAt: checkIn.startsAt,
      title: CALENDAR_TITLE,
    };
  }

  private fullNameOf(client: CheckInClientIdentity): string {
    return `${client.firstName} ${client.lastName}`
      .replace(NAME_UNSAFE_RUNS, " ")
      .trim();
  }
}
