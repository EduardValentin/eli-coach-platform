import type { CheckInSnapshot } from "./check-in";
import type { CheckInClientIdentity } from "./check-in-clients";

export type CheckInNotice = {
  checkIn: CheckInSnapshot;
  client: CheckInClientIdentity;
};

export type CheckInDelivery = "sent" | "failed";

export interface CheckInNotifications {
  requested(notice: CheckInNotice): Promise<CheckInDelivery>;
  withdrawn(notice: CheckInNotice): Promise<CheckInDelivery>;
  approved(notice: CheckInNotice): Promise<CheckInDelivery>;
  declined(notice: CheckInNotice): Promise<CheckInDelivery>;
}

export type CheckInNotification = keyof CheckInNotifications;
