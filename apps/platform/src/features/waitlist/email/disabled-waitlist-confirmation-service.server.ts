import type { WaitlistConfirmationResult, WaitlistConfirmationService } from "@eli-coach-platform/domain/waitlist";

export class DisabledWaitlistConfirmationService implements WaitlistConfirmationService {
  async sendConfirmation(
    _command: Parameters<WaitlistConfirmationService["sendConfirmation"]>[0],
  ): Promise<WaitlistConfirmationResult> {
    return { kind: "sent" };
  }
}
