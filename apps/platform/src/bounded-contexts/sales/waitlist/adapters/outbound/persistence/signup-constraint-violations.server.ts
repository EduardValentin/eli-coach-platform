import { waitlistEntryConstraints } from "./schema.server";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

type ConstraintViolation = {
  code: string;
  constraint: string;
};

const REDUCED_SLOT_VIOLATIONS: readonly ConstraintViolation[] = [
  {
    code: UNIQUE_VIOLATION,
    constraint: waitlistEntryConstraints.reducedSlotPerOffer,
  },
  {
    code: CHECK_VIOLATION,
    constraint: waitlistEntryConstraints.reducedSlotRange,
  },
];

const DUPLICATE_SIGNUP_VIOLATIONS: readonly ConstraintViolation[] = [
  {
    code: UNIQUE_VIOLATION,
    constraint: waitlistEntryConstraints.emailPerOffer,
  },
];

export function rejectsReducedSlot(error: unknown): boolean {
  return violatesOneOf(error, REDUCED_SLOT_VIOLATIONS);
}

export function rejectsDuplicateSignup(error: unknown): boolean {
  return violatesOneOf(error, DUPLICATE_SIGNUP_VIOLATIONS);
}

function violatesOneOf(
  error: unknown,
  violations: readonly ConstraintViolation[],
): boolean {
  const violation = findConstraintViolation(error);

  return violations.some(
    (candidate) =>
      candidate.code === violation?.code &&
      candidate.constraint === violation.constraint,
  );
}

function findConstraintViolation(error: unknown): ConstraintViolation | null {
  if (isConstraintViolation(error)) {
    return error;
  }

  if (error instanceof Error && error.cause !== undefined) {
    return findConstraintViolation(error.cause);
  }

  return null;
}

function isConstraintViolation(error: unknown): error is ConstraintViolation {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "constraint" in error &&
    typeof error.constraint === "string"
  );
}
