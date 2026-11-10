import { isClerkAPIResponseError } from "@clerk/backend/errors";
import type {
  ApiKeyHolder,
  ApiKeyVerifierPort,
} from "~/bounded-contexts/access/accounts/domain/account";

const INVALID_KEY_CODE_PREFIX = "api_key_";
const USER_SUBJECT_PREFIX = "user_";

type VerifiedClerkApiKey = {
  expired: boolean;
  revoked: boolean;
  subject: string;
};

type ClerkApiKeyClient = {
  apiKeys: { verify(secret: string): Promise<VerifiedClerkApiKey> };
};

export class ClerkApiKeyVerifierAdapter implements ApiKeyVerifierPort {
  constructor(private readonly client: ClerkApiKeyClient) {}

  async verify(secret: string): Promise<ApiKeyHolder | null> {
    try {
      const apiKey = await this.client.apiKeys.verify(secret);

      return this.isUsableUserKey(apiKey)
        ? { authSubjectId: apiKey.subject }
        : null;
    } catch (error) {
      if (this.isInvalidKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  private isUsableUserKey(apiKey: VerifiedClerkApiKey): boolean {
    return (
      !apiKey.revoked &&
      !apiKey.expired &&
      apiKey.subject.startsWith(USER_SUBJECT_PREFIX)
    );
  }

  private isInvalidKeyError(error: unknown): boolean {
    return (
      isClerkAPIResponseError(error) &&
      (error.errors[0]?.code.startsWith(INVALID_KEY_CODE_PREFIX) ?? false)
    );
  }
}
