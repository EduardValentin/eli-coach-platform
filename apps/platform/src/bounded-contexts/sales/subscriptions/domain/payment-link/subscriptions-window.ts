import type { SubscriptionsIncidentsPort } from "./subscriptions-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type SubscriptionsWindowOptions = {
  subscriptionsIncidentsPort: SubscriptionsIncidentsPort;
  waitlistModePort: WaitlistModePort;
};

export class SubscriptionsWindow {
  constructor(private readonly options: SubscriptionsWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      return !(await this.options.waitlistModePort.isEnabled());
    } catch (error) {
      this.options.subscriptionsIncidentsPort.salesModeReadFailed(error);

      return false;
    }
  }
}
