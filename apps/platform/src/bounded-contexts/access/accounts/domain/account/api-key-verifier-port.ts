export type ApiKeyHolder = { authSubjectId: string };

export interface ApiKeyVerifierPort {
  verify(secret: string): Promise<ApiKeyHolder | null>;
}
