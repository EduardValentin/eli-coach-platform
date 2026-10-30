import type {
  BotVerificationRequest,
  BotVerificationResult,
  BotVerifierPort,
} from "./bot-verifier-port.server";

export class StaticTokenBotVerifierAdapter implements BotVerifierPort {
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
