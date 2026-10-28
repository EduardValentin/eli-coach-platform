import type { AssessmentCallIncidents } from "./assessment-call-incidents";
import type { WaitlistMode } from "./waitlist-mode";

type AssessmentCallBookingWindowOptions = {
  incidents: AssessmentCallIncidents;
  waitlistMode: WaitlistMode;
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
