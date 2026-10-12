import type { CheckInSnapshot } from "./check-in";
import type { CheckInParty } from "./check-in-party";
import type { CheckInClientIdentity } from "./check-in-clients";

export type CheckInNotice = {
  checkIn: CheckInSnapshot;
  client: CheckInClientIdentity;
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
