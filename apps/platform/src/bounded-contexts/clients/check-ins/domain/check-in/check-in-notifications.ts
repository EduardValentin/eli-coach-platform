import type { ClientIdentity } from "~/bounded-contexts/clients/clients/domain/client";

import type { CheckInSnapshot } from "./check-in";
import type { CheckInParty } from "./check-in-party";
import type { CheckInSeriesSnapshot } from "./check-in-series";

export type CheckInNotice = {
  checkIn: CheckInSnapshot;
  client: Pick<ClientIdentity, "clientId" | "firstName" | "lastName" | "email">;
  recipient: CheckInParty;
};

export type CheckInSeriesNotice = {
  series: CheckInSeriesSnapshot;
  weekStartsAt: Date;
  clientTimeZone: string;
  client: CheckInNotice["client"];
  recipient: "client";
};

export type CheckInDelivery = "sent" | "failed";

export interface CheckInNotifications {
  requested(notice: CheckInNotice): Promise<CheckInDelivery>;
  withdrawn(notice: CheckInNotice): Promise<CheckInDelivery>;
  approved(notice: CheckInNotice): Promise<CheckInDelivery>;
  declined(notice: CheckInNotice): Promise<CheckInDelivery>;
  newTimeProposed(notice: CheckInNotice): Promise<CheckInDelivery>;
  newTimeAccepted(notice: CheckInNotice): Promise<CheckInDelivery>;
  newTimeDeclined(notice: CheckInNotice): Promise<CheckInDelivery>;
  cancelled(notice: CheckInNotice): Promise<CheckInDelivery>;
  seriesSetUp(notice: CheckInSeriesNotice): Promise<CheckInDelivery>;
  seriesChanged(notice: CheckInSeriesNotice): Promise<CheckInDelivery>;
  seriesStopped(notice: CheckInSeriesNotice): Promise<CheckInDelivery>;
}

export type CheckInSeriesNotification =
  "seriesSetUp" | "seriesChanged" | "seriesStopped";

export type CheckInNotification = Exclude<
  keyof CheckInNotifications,
  CheckInSeriesNotification
>;
