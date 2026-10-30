import type { CoachingSalesIncidentsPort } from "./coaching-sales-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type CoachingSalesWindowOptions = {
  incidents: CoachingSalesIncidentsPort;
  waitlistMode: WaitlistModePort;
};

export class CoachingSalesWindow {
  constructor(private readonly options: CoachingSalesWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      return !(await this.options.waitlistMode.isEnabled());
    } catch (error) {
      this.options.incidents.salesModeReadFailed(error);

      return false;
    }
  }
}
