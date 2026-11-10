import type {
  ApiKeyHolder,
  ApiKeyVerifierPort,
} from "~/bounded-contexts/access/accounts/domain/account";

export class InMemoryApiKeyVerifierAdapter implements ApiKeyVerifierPort {
  async verify(): Promise<ApiKeyHolder | null> {
    return null;
  }
}
