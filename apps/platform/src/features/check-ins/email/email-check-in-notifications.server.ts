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
  coachCheckInJoinPath,
} from "~/features/check-ins/public/paths";

import {
  CheckInApprovedByClientEmail,
  checkInApprovedByClientSubject,
  checkInApprovedByClientText,
} from "./check-in-approved-by-client-email.server";
import {
  CheckInApprovedEmail,
  checkInApprovedSubject,
  checkInApprovedText,
} from "./check-in-approved-email.server";
import {
  CheckInDeclinedByClientEmail,
  checkInDeclinedByClientSubject,
  checkInDeclinedByClientText,
} from "./check-in-declined-by-client-email.server";
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
  CheckInScheduleCancelledEmail,
  checkInScheduleCancelledSubject,
  checkInScheduleCancelledText,
} from "./check-in-schedule-cancelled-email.server";
import {
  CheckInScheduledEmail,
  checkInScheduledSubject,
  checkInScheduledText,
} from "./check-in-scheduled-email.server";
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

const INVITE_PRODUCT_NAME = "Check-in";
const NAME_UNSAFE_RUNS = /[\p{Cc}\s]+/gu;

export class EmailCheckInNotifications implements CheckInNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailCheckInNotificationsOptions,
  ) {}

  requested(notice: CheckInNotice): Promise<CheckInDelivery> {
    return notice.recipient === "coach"
      ? this.sendClientRequestToCoach(notice)
      : this.sendCoachRequestToClient(notice);
  }

  withdrawn(notice: CheckInNotice): Promise<CheckInDelivery> {
    return notice.recipient === "coach"
      ? this.sendClientWithdrawalToCoach(notice)
      : this.sendCoachCancellationToClient(notice);
  }

  approved(notice: CheckInNotice): Promise<CheckInDelivery> {
    return notice.recipient === "client"
      ? this.sendCoachApprovalToClient(notice)
      : this.sendClientApprovalToCoach(notice);
  }

  declined(notice: CheckInNotice): Promise<CheckInDelivery> {
    return notice.recipient === "client"
      ? this.sendCoachDeclineToClient(notice)
      : this.sendClientDeclineToCoach(notice);
  }

  private sendClientRequestToCoach(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      clientName: this.fullNameOf(notice.client),
      note: notice.checkIn.note,
      when: this.coachMomentOf(notice),
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

  private sendCoachRequestToClient(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      note: notice.checkIn.note,
      when: this.clientMomentOf(notice),
      checkInsUrl: this.publicUrlOf(CLIENT_CHECK_INS_PATH),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "requested",
      to: notice.client.email,
      subject: checkInScheduledSubject(),
      text: checkInScheduledText(props),
      body: createElement(CheckInScheduledEmail, props),
    });
  }

  private sendClientWithdrawalToCoach(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      clientName: this.fullNameOf(notice.client),
      when: this.coachMomentOf(notice),
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

  private sendCoachCancellationToClient(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      when: this.clientMomentOf(notice),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "withdrawn",
      to: notice.client.email,
      subject: checkInScheduleCancelledSubject(),
      text: checkInScheduleCancelledText(props),
      body: createElement(CheckInScheduleCancelledEmail, props),
    });
  }

  private sendCoachApprovalToClient(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const joinUrl = this.publicUrlOf(clientCheckInJoinPath(notice.checkIn.id));
    const event = this.toCalendarEvent({
      checkIn: notice.checkIn,
      joinUrl,
      withWhom: COACH_DISPLAY_NAME,
    });
    const props = {
      when: this.clientMomentOf(notice),
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

  private sendClientApprovalToCoach(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const clientName = this.fullNameOf(notice.client);
    const joinUrl = this.publicUrlOf(coachCheckInJoinPath(notice.checkIn.id));
    const event = this.toCalendarEvent({
      checkIn: notice.checkIn,
      joinUrl,
      withWhom: clientName,
    });
    const props = {
      clientName,
      when: this.coachMomentOf(notice),
      joinUrl,
      googleCalendarUrl: buildGoogleCalendarUrl(
        event,
        notice.checkIn.coachTimeZone,
      ),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "approved",
      to: this.options.coachEmail,
      replyTo: notice.client.email,
      attachments: [this.inviteFor(event)],
      subject: checkInApprovedByClientSubject(props),
      text: checkInApprovedByClientText(props),
      body: createElement(CheckInApprovedByClientEmail, props),
    });
  }

  private sendCoachDeclineToClient(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      when: this.clientMomentOf(notice),
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

  private sendClientDeclineToCoach(
    notice: CheckInNotice,
  ): Promise<CheckInDelivery> {
    const props = {
      clientName: this.fullNameOf(notice.client),
      when: this.coachMomentOf(notice),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "declined",
      to: this.options.coachEmail,
      replyTo: notice.client.email,
      subject: checkInDeclinedByClientSubject(props),
      text: checkInDeclinedByClientText(props),
      body: createElement(CheckInDeclinedByClientEmail, props),
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

  private coachMomentOf(notice: CheckInNotice): string {
    return formatCallMoment(
      notice.checkIn.startsAt,
      notice.checkIn.coachTimeZone,
    );
  }

  private clientMomentOf(notice: CheckInNotice): string {
    return formatCallMoment(
      notice.checkIn.startsAt,
      notice.checkIn.clientTimeZone,
    );
  }

  private toCalendarEvent({
    checkIn,
    joinUrl,
    withWhom,
  }: {
    checkIn: CheckInNotice["checkIn"];
    joinUrl: string;
    withWhom: string;
  }): CalendarEvent {
    return {
      description: [
        `A ${CHECK_IN_RULES.durationMinutes}-minute check-in with ${withWhom}.`,
        `Join the check-in: ${joinUrl}`,
      ].join("\n"),
      endsAt: checkIn.endsAt,
      id: checkIn.id,
      joinUrl,
      startsAt: checkIn.startsAt,
      title: `Check-in with ${withWhom}`,
    };
  }

  private fullNameOf(client: CheckInClientIdentity): string {
    return `${client.firstName} ${client.lastName}`
      .replace(NAME_UNSAFE_RUNS, " ")
      .trim();
  }
}
