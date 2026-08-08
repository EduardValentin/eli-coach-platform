import type { WaitlistConfirmationService } from "@eli-coach-platform/domain";

export class DisabledWaitlistConfirmationService implements WaitlistConfirmationService {
  async sendConfirmation(
    _command: Parameters<WaitlistConfirmationService["sendConfirmation"]>[0],
  ): Promise<void> {
    return Promise.resolve();
  }
}
