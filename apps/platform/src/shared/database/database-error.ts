type DatabaseErrorFields = {
  code: string | null;
  constraint: string | null;
};

export function isCausedByDatabaseError(
  error: unknown,
  matches: (fields: DatabaseErrorFields) => boolean,
): boolean {
  return causeChainOf(error)
    .map((cause) => ({
      code: readErrorCode(cause),
      constraint: readErrorConstraint(cause),
    }))
    .some(matches);
}

function causeChainOf(error: unknown): object[] {
  const chain: object[] = [];

  for (
    let current = error;
    isObject(current) && !chain.includes(current);
    current = readCause(current)
  ) {
    chain.push(current);
  }

  return chain;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function readCause(error: object): unknown {
  return "cause" in error ? error.cause : null;
}

function readErrorCode(error: object): string | null {
  return "code" in error && typeof error.code === "string" ? error.code : null;
}

function readErrorConstraint(error: object): string | null {
  return "constraint" in error && typeof error.constraint === "string"
    ? error.constraint
    : null;
}
