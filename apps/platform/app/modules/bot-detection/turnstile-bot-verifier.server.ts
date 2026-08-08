import type { BotVerificationRequest, BotVerificationResult, BotVerifier } from "./bot-verifier.server";

type SiteverifyRequestBody = {
  remoteip?: string;
  response: string;
  secret: string;
};

type FetchSiteverifyRequest = {
  body: SiteverifyRequestBody;
  method: "POST";
};

type FetchSiteverify = (
  url: string,
  request: FetchSiteverifyRequest,
) => Promise<Response>;

type TurnstileBotVerifierOptions = {
  fetchSiteverify?: FetchSiteverify;
  secretKey: string;
  siteverifyUrl: string;
};

export class TurnstileBotVerifier implements BotVerifier {
  private readonly fetchSiteverify: FetchSiteverify;
  private readonly secretKey: string;
  private readonly siteverifyUrl: string;

  constructor(options: TurnstileBotVerifierOptions) {
    this.fetchSiteverify = options.fetchSiteverify ?? fetchTurnstileSiteverify;
    this.secretKey = options.secretKey;
    this.siteverifyUrl = options.siteverifyUrl;
  }

  async verifySubmission(request: BotVerificationRequest): Promise<BotVerificationResult> {
    if (!request.token) {
      return { status: "rejected" };
    }

    try {
      const response = await this.fetchSiteverify(this.siteverifyUrl, {
        body: createSiteverifyRequestBody({
          remoteIp: request.remoteIp,
          secretKey: this.secretKey,
          token: request.token,
        }),
        method: "POST",
      });

      if (!response.ok) {
        return { status: "unavailable" };
      }

      const result = parseSiteverifyResponse(await response.json());

      if (!result) {
        return { status: "unavailable" };
      }

      return result.success && result.action === request.action
        ? { status: "verified" }
        : { status: "rejected" };
    } catch {
      return { status: "unavailable" };
    }
  }
}

function parseSiteverifyResponse(responseBody: unknown): {
  action: string | null;
  success: boolean;
} | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const fields = responseBody as Record<string, unknown>;

  if (typeof fields.success !== "boolean") {
    return null;
  }

  return {
    action: typeof fields.action === "string" ? fields.action : null,
    success: fields.success,
  };
}

function createSiteverifyRequestBody(options: {
  remoteIp: string | null;
  secretKey: string;
  token: string;
}): SiteverifyRequestBody {
  const body: SiteverifyRequestBody = {
    response: options.token,
    secret: options.secretKey,
  };

  if (options.remoteIp) {
    body.remoteip = options.remoteIp;
  }

  return body;
}

async function fetchTurnstileSiteverify(
  url: string,
  request: FetchSiteverifyRequest,
): Promise<Response> {
  return fetch(url, {
    body: new URLSearchParams(request.body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: request.method,
  });
}
