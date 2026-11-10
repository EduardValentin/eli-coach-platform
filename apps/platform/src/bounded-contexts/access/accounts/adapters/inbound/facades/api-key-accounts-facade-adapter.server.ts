import type { ResolveApiKeyAccountUseCase } from "~/bounded-contexts/access/accounts/domain/account";
import type {
  ApiKeyAccountResolutionDto,
  ApiKeyAccountsFacade,
} from "~/bounded-contexts/access/public/api-key-accounts-facade";

export class ApiKeyAccountsFacadeAdapter implements ApiKeyAccountsFacade {
  constructor(
    private readonly resolveApiKeyAccountUseCase: ResolveApiKeyAccountUseCase,
  ) {}

  async resolve(
    authorizationHeader: string | null,
  ): Promise<ApiKeyAccountResolutionDto> {
    const resolution =
      await this.resolveApiKeyAccountUseCase.execute(authorizationHeader);

    if (resolution.status !== "resolved") {
      return resolution;
    }

    return {
      status: "resolved",
      account: { id: resolution.account.id, role: resolution.account.role },
    };
  }
}
