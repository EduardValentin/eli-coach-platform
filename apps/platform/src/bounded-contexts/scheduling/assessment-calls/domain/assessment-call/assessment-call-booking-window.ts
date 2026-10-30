import type { AssessmentCallIncidentsPort } from "./assessment-call-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type AssessmentCallBookingWindowOptions = {
  assessmentCallIncidentsPort: AssessmentCallIncidentsPort;
  waitlistModePort: WaitlistModePort;
};

export class AssessmentCallBookingWindow {
  constructor(private readonly options: AssessmentCallBookingWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      return !(await this.options.waitlistModePort.isEnabled());
    } catch {
      this.options.assessmentCallIncidentsPort.bookingModeReadFailed();

      return false;
    }
  }
}
