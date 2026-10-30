import type { OpenClientProfileUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type {
  ClientProfileFacade,
  ClientProfileOpeningDto,
} from "~/bounded-contexts/clients/public/client-profile-facade";

export class ClientProfileFacadeAdapter implements ClientProfileFacade {
  constructor(
    private readonly openClientProfileUseCase: OpenClientProfileUseCase,
  ) {}

  openClientProfile({ clientId, openedAt }: ClientProfileOpeningDto) {
    return this.openClientProfileUseCase.execute({
      clientId,
      at: new Date(openedAt),
    });
  }
}
