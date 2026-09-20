export type FieldValidationIssue = {
  path: PropertyKey[];
};

export function resolveFieldErrorCode<Code extends string>(
  issues: readonly FieldValidationIssue[],
  fieldErrorCodes: Record<string, Code>,
  fallback: Code,
): Code {
  for (const [field, code] of Object.entries(fieldErrorCodes)) {
    if (issues.some((issue) => issue.path[0] === field)) {
      return code;
    }
  }

  return fallback;
}
