import type { WaitlistConfirmationSender } from "@eli-coach-platform/domain";

export class MockWaitlistConfirmationSender implements WaitlistConfirmationSender {
  async sendConfirmation(_command: { email: string }): Promise<void> {
    return Promise.resolve();
  }
}
