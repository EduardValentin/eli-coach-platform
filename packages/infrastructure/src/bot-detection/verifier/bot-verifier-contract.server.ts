export type BotVerificationRequest = {
  action: string;
  remoteIp: string | null;
  token: string | null;
};

export type BotVerificationResult =
  { status: "verified" } | { status: "rejected" } | { status: "unavailable" };

export interface BotVerifier {
  verifySubmission(
    request: BotVerificationRequest,
  ): Promise<BotVerificationResult>;
}
