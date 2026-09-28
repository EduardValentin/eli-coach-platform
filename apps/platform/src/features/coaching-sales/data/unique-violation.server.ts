import { isCausedByDatabaseError } from "@eli-coach-platform/db";

const UNIQUE_VIOLATION_CODE = "23505";

export function violatesUniqueConstraint(
  error: unknown,
  constraint: string,
): boolean {
  return isCausedByDatabaseError(
    error,
    (fields) =>
      fields.code === UNIQUE_VIOLATION_CODE && fields.constraint === constraint,
  );
}
