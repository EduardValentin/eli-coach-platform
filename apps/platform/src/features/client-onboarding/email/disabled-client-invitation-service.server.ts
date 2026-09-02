import type { ClientInvitationService } from "@eli-coach-platform/domain";

export class DisabledClientInvitationService implements ClientInvitationService {
  async sendInvitation(
    _command: Parameters<ClientInvitationService["sendInvitation"]>[0],
  ): Promise<void> {
    return Promise.resolve();
  }
}
