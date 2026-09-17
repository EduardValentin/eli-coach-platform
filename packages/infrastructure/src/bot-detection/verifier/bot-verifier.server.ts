import type {
  BotVerificationRequest,
  BotVerificationResult,
  BotVerifier,
} from "@eli-coach-platform/domain/shared";

export class StaticTokenBotVerifier implements BotVerifier {
  constructor(private readonly options: { validToken: string }) {}

  async verifySubmission(
    request: BotVerificationRequest,
  ): Promise<BotVerificationResult> {
    return {
      status:
        request.token === this.options.validToken ? "verified" : "rejected",
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
