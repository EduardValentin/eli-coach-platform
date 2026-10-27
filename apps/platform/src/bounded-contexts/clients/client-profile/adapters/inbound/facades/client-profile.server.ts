import type { OpenClientProfileUseCase } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile";

export function createClientProfileFacade(
  openClientProfile: OpenClientProfileUseCase,
): ClientProfileFacade {
  return {
    openClientProfile: ({ clientId, openedAt }) =>
      openClientProfile.execute({ clientId, at: new Date(openedAt) }),
  };
}
