import type { AssessmentCallIncidentsPort } from "./assessment-call-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type AssessmentCallBookingWindowOptions = {
  incidents: AssessmentCallIncidentsPort;
  waitlistMode: WaitlistModePort;
};

export class AssessmentCallBookingWindow {
  constructor(private readonly options: AssessmentCallBookingWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      return !(await this.options.waitlistMode.isEnabled());
    } catch {
      this.options.incidents.bookingModeReadFailed();

      return false;
    }
  }
}
