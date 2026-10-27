export function errorClassOf(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export function errorCodeOf(error: unknown): { errorCode?: string } {
  if (!(error instanceof Error) || !("code" in error)) return {};

  return typeof error.code === "string" ? { errorCode: error.code } : {};
}
