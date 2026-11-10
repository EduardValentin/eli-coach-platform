export type ApiKeyAccountDto = { id: string; role: "CLIENT" | "COACH" };

export type ApiKeyAccountResolutionDto =
  | { status: "resolved"; account: ApiKeyAccountDto }
  | { status: "invalid" }
  | { status: "unprovisioned" }
  | { status: "unavailable" };

export interface ApiKeyAccountsFacade {
  resolve(
    authorizationHeader: string | null,
  ): Promise<ApiKeyAccountResolutionDto>;
}
