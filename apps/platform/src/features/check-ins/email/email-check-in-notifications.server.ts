import { joinBasePath } from "@eli-coach-platform/config";
import type {
  CheckInClientIdentity,
  CheckInDelivery,
  CheckInNotice,
  CheckInNotification,
  CheckInNotifications,
} from "@eli-coach-platform/domain/check-in";
import type { Clock } from "@eli-coach-platform/domain/shared";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
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

export type EmailCheckInNotificationsOptions = {
  appBasePath: string;
  clock: Clock;
  coachEmail: string;
  publicAppUrl: string;
};

type CheckInEmail = {
  checkInId: string;
  notification: CheckInNotification;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  body: ReactElement;
};

export class EmailCheckInNotifications implements CheckInNotifications {
  constructor(
    private readonly productEmail: ProductEmail,
    private readonly options: EmailCheckInNotificationsOptions,
  ) {}

  requested(notice: CheckInNotice): Promise<CheckInDelivery> {
    const props = {
      clientName: EmailCheckInNotifications.fullNameOf(notice.client),
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
      clientName: EmailCheckInNotifications.fullNameOf(notice.client),
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
    const props = {
      when: formatCallMoment(
        notice.checkIn.startsAt,
        notice.checkIn.clientTimeZone,
      ),
      joinUrl: this.publicUrlOf(clientCheckInJoinPath(notice.checkIn.id)),
      currentYear: this.currentYear(),
    };

    return this.send({
      checkInId: notice.checkIn.id,
      notification: "approved",
      to: notice.client.email,
      subject: checkInApprovedSubject(props),
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
      subject: checkInDeclinedSubject(props),
      text: checkInDeclinedText(props),
      body: createElement(CheckInDeclinedEmail, props),
    });
  }

  private async send(email: CheckInEmail): Promise<CheckInDelivery> {
    const delivery = await this.productEmail.send({
      html: `<!doctype html>${renderToStaticMarkup(email.body)}`,
      idempotencyKey: `check-in:${email.checkInId}:${email.notification}`,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      subject: email.subject,
      text: email.text,
      to: email.to,
    });

    return delivery.kind === "sent" ? "sent" : "failed";
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

  private static fullNameOf(client: CheckInClientIdentity): string {
    return `${client.firstName} ${client.lastName}`;
  }
}
