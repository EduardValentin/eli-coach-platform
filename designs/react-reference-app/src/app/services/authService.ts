export type PrototypeSignInOutcome = 'success' | 'provisioning-failure';

export type SignInErrorCode = 'PROVISIONING_FAILURE';

export class SignInError extends Error {
  code: SignInErrorCode;
  constructor(code: SignInErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SignInError';
  }
}

const SIMULATED_LATENCY_MS = 1200;

// Stands in for the backend's post-OTP account provisioning. A failure there
// invalidates the session rather than leaving a half-signed-in user, so the
// caller keeps the anonymous session it started with.
export async function completeSignIn(
  outcome: PrototypeSignInOutcome,
): Promise<'user'> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'provisioning-failure') {
    throw new SignInError(
      'PROVISIONING_FAILURE',
      "The account could not be provisioned, so no session was established.",
    );
  }

  return 'user';
}
