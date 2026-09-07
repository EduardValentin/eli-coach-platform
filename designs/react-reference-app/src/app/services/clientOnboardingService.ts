export type PrototypeClientOnboardingOutcome =
  | 'success'
  | 'replaced-invitation'
  | 'already-client'
  | 'delivery-failure';

export type OnboardClientErrorCode = 'ALREADY_CLIENT' | 'DELIVERY_FAILURE';

export class OnboardClientError extends Error {
  code: OnboardClientErrorCode;
  constructor(code: OnboardClientErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'OnboardClientError';
  }
}

export type OnboardClientResult = {
  replacedPendingInvitation: boolean;
};

const SIMULATED_LATENCY_MS = 900;

// Stands in for the coach onboarding endpoint. The two failures differ in what
// the coach can do next: an already-onboarded client is a dead end that stored
// nothing, while a delivery failure keeps her profile and invitation, so
// sending again is the recovery rather than re-entering the whole wizard.
export async function sendClientInvitation(
  outcome: PrototypeClientOnboardingOutcome,
): Promise<OnboardClientResult> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'already-client') {
    throw new OnboardClientError(
      'ALREADY_CLIENT',
      'That email already belongs to one of your clients, so nothing was saved.',
    );
  }

  if (outcome === 'delivery-failure') {
    throw new OnboardClientError(
      'DELIVERY_FAILURE',
      'The profile and invitation were saved, but the email could not be sent.',
    );
  }

  return { replacedPendingInvitation: outcome === 'replaced-invitation' };
}
