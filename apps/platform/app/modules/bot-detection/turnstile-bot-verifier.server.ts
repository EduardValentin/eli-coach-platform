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

type SiteverifyActionPolicy = "strict" | "testing";

type TurnstileBotVerifierOptions = {
  actionPolicy?: SiteverifyActionPolicy;
  fetchSiteverify?: FetchSiteverify;
  secretKey: string;
};

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileBotVerifier implements BotVerifier {
  private readonly actionPolicy: SiteverifyActionPolicy;
  private readonly fetchSiteverify: FetchSiteverify;
  private readonly secretKey: string;

  constructor(options: TurnstileBotVerifierOptions) {
    this.actionPolicy = options.actionPolicy ?? "strict";
    this.fetchSiteverify = options.fetchSiteverify ?? fetchTurnstileSiteverify;
    this.secretKey = options.secretKey;
  }

  async verifySubmission(request: BotVerificationRequest): Promise<BotVerificationResult> {
    if (!request.token) {
      return { valid: false };
    }

    try {
      const response = await this.fetchSiteverify(TURNSTILE_SITEVERIFY_URL, {
        body: createSiteverifyRequestBody({
          remoteIp: request.remoteIp,
          secretKey: this.secretKey,
          token: request.token,
        }),
        method: "POST",
      });

      if (!response.ok) {
        return { valid: false };
      }

      const result = parseSiteverifyResponse(await response.json());

      return {
        valid: result.success && this.isAcceptedAction(result.action, request.action),
      };
    } catch {
      return { valid: false };
    }
  }

  private isAcceptedAction(resultAction: string | null, requestedAction: string): boolean {
    if (this.actionPolicy === "testing") {
      return true;
    }

    return resultAction === requestedAction;
  }
}

function parseSiteverifyResponse(responseBody: unknown): {
  action: string | null;
  success: boolean;
} {
  if (!responseBody || typeof responseBody !== "object") {
    return {
      action: null,
      success: false,
    };
  }

  const fields = responseBody as Record<string, unknown>;

  return {
    action: typeof fields.action === "string" ? fields.action : null,
    success: fields.success === true,
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
