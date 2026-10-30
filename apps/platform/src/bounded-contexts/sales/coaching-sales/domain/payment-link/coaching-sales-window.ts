import type { CoachingSalesIncidentsPort } from "./coaching-sales-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type CoachingSalesWindowOptions = {
  coachingSalesIncidentsPort: CoachingSalesIncidentsPort;
  waitlistModePort: WaitlistModePort;
};

export class CoachingSalesWindow {
  constructor(private readonly options: CoachingSalesWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      return !(await this.options.waitlistModePort.isEnabled());
    } catch (error) {
      this.options.coachingSalesIncidentsPort.salesModeReadFailed(error);

      return false;
    }
  }
}
