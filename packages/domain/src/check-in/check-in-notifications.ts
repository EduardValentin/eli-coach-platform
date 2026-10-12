import type { ClientIdentity } from "../client";

import type { CheckInSnapshot } from "./check-in";
import type { CheckInParty } from "./check-in-party";

export type CheckInNotice = {
  checkIn: CheckInSnapshot;
  client: Pick<ClientIdentity, "clientId" | "firstName" | "lastName" | "email">;
  recipient: CheckInParty;
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
}

export type CheckInNotification = keyof CheckInNotifications;
