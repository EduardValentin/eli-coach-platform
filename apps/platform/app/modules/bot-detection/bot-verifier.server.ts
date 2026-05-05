import { TEST_TURNSTILE_TOKEN } from "./bot-detection-contract";

export type BotVerificationRequest = {
  action: string;
  remoteIp: string | null;
  token: string | null;
};

export type BotVerificationResult = {
  valid: boolean;
};

export type BotVerifier = {
  verifySubmission(request: BotVerificationRequest): Promise<BotVerificationResult>;
};

export class StaticTokenBotVerifier implements BotVerifier {
  constructor(private readonly options = { validToken: TEST_TURNSTILE_TOKEN }) {}

  async verifySubmission(request: BotVerificationRequest): Promise<BotVerificationResult> {
    return {
      valid: request.token === this.options.validToken,
    };
  }
}

export function resolveRequestRemoteIp(request: Request): string | null {
  const cloudflareIp = request.headers.get("CF-Connecting-IP");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get("X-Forwarded-For");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() || null;
}
