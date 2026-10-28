import type { CoachingSalesIncidents } from "./coaching-sales-incidents";
import type { WaitlistMode } from "./waitlist-mode";

type CoachingSalesWindowOptions = {
  incidents: CoachingSalesIncidents;
  waitlistMode: WaitlistMode;
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
