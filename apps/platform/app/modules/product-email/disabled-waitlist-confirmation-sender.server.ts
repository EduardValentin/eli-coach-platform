import type { WaitlistConfirmationSender } from "@eli-coach-platform/domain";

export class DisabledWaitlistConfirmationSender implements WaitlistConfirmationSender {
  async sendConfirmation(
    _command: Parameters<WaitlistConfirmationSender["sendConfirmation"]>[0],
  ): Promise<void> {
    return Promise.resolve();
  }
}
