import { isClerkAPIResponseError } from "@clerk/backend/errors";
import type {
  ApiKeyHolder,
  ApiKeyVerifierPort,
} from "~/bounded-contexts/access/accounts/domain/account";

const INVALID_KEY_CODE_PREFIX = "api_key_";
const USER_SUBJECT_PREFIX = "user_";

type ClerkApiKeyClient = {
  apiKeys: { verify(secret: string): Promise<{ subject: string }> };
};

export class ClerkApiKeyVerifierAdapter implements ApiKeyVerifierPort {
  constructor(private readonly client: ClerkApiKeyClient) {}

  async verify(secret: string): Promise<ApiKeyHolder | null> {
    try {
      const apiKey = await this.client.apiKeys.verify(secret);

      return apiKey.subject.startsWith(USER_SUBJECT_PREFIX)
        ? { authSubjectId: apiKey.subject }
        : null;
    } catch (error) {
      if (this.isInvalidKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  private isInvalidKeyError(error: unknown): boolean {
    return (
      isClerkAPIResponseError(error) &&
      (error.errors[0]?.code.startsWith(INVALID_KEY_CODE_PREFIX) ?? false)
    );
  }
}
